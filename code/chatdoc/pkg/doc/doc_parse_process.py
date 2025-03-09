import numpy as np
from shapely.geometry import LineString, Point

# @dataclass
# class docLine:
#     """docLine的数据结构."""
#     content: str  # 块的内容
#     pos: List[int]  # 块的位置
#     ori_id: str  # 块的位置 页数+顺序
#     type: str  # 表格块或者文本块

def is_type_list(x, type):
    """To be continued.
    :param x:
    :param type:
    :return:
    """
    if not isinstance(x, list):
        return False

    return all(isinstance(item, type) for item in x)


def get_box_height(box):
    """
    获取一个box的高度，用途一行文本的子高.
    :param box:  Coordinates of quadrangle.
    :return:
    """
    assert is_type_list(box, (float, int))
    assert len(box) == 8
    points_x = [max(x, 0) for x in box[0:8:2]]
    points_y = [max(y, 0) for y in box[1:9:2]]
    points_x, points_y = sort_vertex(points_x, points_y)
    points = [Point(points_x[i], points_y[i]) for i in range(4)]
    edges = [
        LineString([points[i], points[i + 1 if i < 3 else 0]])
        for i in range(4)
    ]
    # box_width = max(edges[0].length, edges[2].length)
    box_height = round(max(edges[1].length, edges[3].length))
    return box_height


def sort_vertex(points_x, points_y):
    """
    Sort box vertices in clockwise order from left-top first.
    :param points_x: (list[float]): x of four vertices.
    :param points_y:  (list[float]): y of four vertices.
    :return:
        sorted_points_x (list[float]): x of sorted four vertices.
        sorted_points_y (list[float]): y of sorted four vertices.
    """
    assert is_type_list(points_x, (float, int))
    assert is_type_list(points_y, (float, int))
    assert len(points_x) == 4
    assert len(points_y) == 4
    vertices = np.stack((points_x, points_y), axis=-1).astype(np.float32)
    vertices = _sort_vertex(vertices)
    sorted_points_x = list(vertices[:, 0])
    sorted_points_y = list(vertices[:, 1])
    return sorted_points_x, sorted_points_y


def _sort_vertex(vertices):
    assert vertices.ndim == 2
    assert vertices.shape[-1] == 2
    N = vertices.shape[0]
    if N == 0:
        return vertices

    center = np.mean(vertices, axis=0)
    directions = vertices - center
    angles = np.arctan2(directions[:, 1], directions[:, 0])
    sort_idx = np.argsort(angles)
    vertices = vertices[sort_idx]

    left_top = np.min(vertices, axis=0)
    dists = np.linalg.norm(left_top - vertices, axis=-1, ord=2)
    lefttop_idx = np.argmin(dists)
    indexes = (np.arange(N, dtype=np.int32) + lefttop_idx) % N
    return vertices[indexes]


def valid_xml_char_ordinal(c):
    """验证字符是否是有效的."""
    codepoint = ord(c)
    # conditions ordered by presumed frequency.
    return (0x20 <= codepoint <= 0xD7FF or codepoint in (0x9, 0xA, 0xD)
            or 0xE000 <= codepoint <= 0xFFFD or 0x10000 <= codepoint <= 0x10FFFF)


def json_to_html(table_dict, lines):
    """
    表格的json转html.
    :param table_dict: 表格的json
    :param lines: id对应的文本
    :return: 表格的html文件
    """
    rows = table_dict["rows"]
    cells_info = table_dict.get("cells")
    table_html = '<table border="1">'
    for i in range(0, rows):
        if i == 0:
            table_html += "<tr>"
        else:
            table_html += "</tr><tr>"
        for cell_info in cells_info:
            row = cell_info["row"]
            # col = cell_info["col"]
            row_span = cell_info["row_span"]
            col_span = cell_info["col_span"]
            content = ''
            for cell_content in cell_info['content']:
                contents = [lines[content_list] for content_list in cell_content['content']]
                content += ''.join(contents)
            cleaned_string = ''.join(c for c in content if valid_xml_char_ordinal(c))
            if row == i:
                cell = "<td rowspan={row_span} colspan={col_span}>{content}</td>".\
                    format(row_span=row_span, col_span=col_span, content=str(cleaned_string))
                table_html += cell
            else:
                continue
    table_html += "</tr></table>"
    return table_html


def json2lines(page, with_pos, p_index):
    """
    简单的段落文字解析，从doc-parse中提取结果.
    :param res_json: 解析的json结果
    :return: 用来保存每一页的对应的段落文本的字典
    """
    # 用来保存每一页的对应的段落文本
    docLines, docTexts = [], []

    # for p_index, page in enumerate(pages):
    content, structured = page['content'], page['structured']
    # 用来保存每次文本块的id对应的text
    lines = {}
    lines_pos = {}
    for con in content:
        # 只有line和image
        if con['type'] == 'line':
            lines[con['id']] = con['text']
            lines_pos[con['id']] = con['pos']
    for s_index, struct in enumerate(structured):
        # 只有 textBlock、image、table、footer、header
        if struct['type'] in ['textblock', 'image']:
            content = struct['content']
            text = ''
            pos = struct['pos']
            # 拼接段落信息
            for id_c in content:
                cleaned_string = ''.join(c for c in lines[id_c] if valid_xml_char_ordinal(c))
                text += cleaned_string
            if len(text) > 1 and text != " ":
                height = -1
                if with_pos:
                    height = get_box_height(lines_pos[content[0]])
                    text = str(height) + '\t' + text
                line = {'content': text, 'line_height': height, 'pos': pos,
                        'ori_id': str(p_index) + "," + str(s_index), 'type': "textblock"}
                docLines.append(line)
                docTexts.append(line)
        if struct['type'] == 'table':
            table_html = json_to_html(table_dict=struct, lines=lines)
            pos = struct['pos']
            line = {'content': table_html, 'line_height': 1, 'pos': pos, 'ori_id': str(p_index) + "," + str(s_index), 'type': "table"}
            docTexts.append(line)
    return docLines, docTexts

