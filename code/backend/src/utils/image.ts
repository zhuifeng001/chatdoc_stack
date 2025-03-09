export const isImage = (filename: string) => {
  return /.(jpg|jpeg|png|bmp|BMP|JPG|JPEG|PNG|tif|tiff|TIF|TIFF)$/.test(filename);
};
