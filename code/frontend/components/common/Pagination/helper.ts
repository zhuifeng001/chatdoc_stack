export const getDefaultPaginationConfig = () => {
  return {
    ...getDefaultPagination(),
    showTotal: (total: number) => `共 ${total} 条`,
    showSizeChanger: true,
    showQuickJumper: true
    // hideOnSinglePage: true,
  }
}

export const getDefaultPagination = () => {
  return {
    pageSize: 10,
    current: 1,
    total: 10
  }
}
