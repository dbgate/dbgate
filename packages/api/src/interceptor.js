function interceptor(req, res, next) {
    // 在这里编写拦截逻辑
    // 可以根据需要对请求进行验证、修改请求参数、记录日志等操作
  
    // 调用 next() 继续处理请求
    // console.log("拦截了"+req);
    next();
  }
  
  module.exports = interceptor;