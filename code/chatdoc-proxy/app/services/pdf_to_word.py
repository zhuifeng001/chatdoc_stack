import io
from fastapi.responses import StreamingResponse


def pdf_to_word(pdf_content: bytes):
    from pdf2docx import Converter

    # 将PDF内容写入临时文件
    with open("temp.pdf", "wb") as temp_pdf:
        temp_pdf.write(pdf_content)

    # 使用pdf2docx库进行转换
    cv = Converter("temp.pdf")
    cv.convert("temp.docx", start=0, end=None, multi_processing=False)
    cv.close()

    # 读取转换后的Word文件
    with open("temp.docx", "rb") as temp_docx:
        word_content = temp_docx.read()

    # 返回Word文件流
    return StreamingResponse(io.BytesIO(word_content), media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", headers={"Content-Disposition": "attachment; filename=output.docx"})
