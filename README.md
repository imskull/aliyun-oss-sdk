aliyun-oss-sdk
==============

阿里云OSS的Node.js SDK

阿里云OSS目前未提供官方版Node.js的SDK，本源代码第一版原始文件来源于阿里云论坛，使用MIT授权协议，原作者为Gao Xiong。

这里的版本目前的改动
-----------------
- 修复不支持中文文件名的bug。

使用说明
-------

- 程序使用 mocha 测试框架，运行测试程序前需要安装 mocha
- 运行测试程序前需要修改 /test/config.js，把里面 access_id 和 access_key 改成你自己的。
