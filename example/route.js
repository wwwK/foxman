module.exports = [
  {
    method: 'GET', url: '/index.html', sync: true, filePath: 'page/4pl/expenseTemplate/list'
  },{
    method: 'GET', url: '/index2.html', sync: false, filePath: 'index'
  },{
    method: 'GET', url: '/home/:id', sync: true, filePath: 'page/4pl/expenseTemplate/list'
  }
];