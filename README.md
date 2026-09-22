# Craps 现场助手 MVP

一个无需登录、数据保存在当前浏览器的移动端 Craps bankroll / odds tracker。

打开 `index.html` 即可使用。它也已是一个可安装的手机 Web App：将 `outputs/` 文件夹部署到任意 HTTPS 静态网站后，在手机浏览器打开网址并选择「添加到主屏幕」。

## 使用方式

1. 设定起始 bankroll、桌面最低下注和最大 Odds 倍数。
2. 输入 Pass Line、Odds 与 Place 4/5/6/8/9/10。
3. 点击实际掷出的点数；应用自动更新 point、roll count、银行余额和记录。
4. 在「下一掷的结果」查看每个结果产生的即时净变化；7-out 会清空当前下注。

赔率采用标准 Pass Line Odds 与 Place Bet 赔率。筹码可下注单位、桌规和 dealer 的取整处理仍以现场为准。

Press 工具仅帮助计算赢利后的金额分配，不预测骰子结果，也不改变赌场优势。

## 手机使用

- **iPhone：**用 Safari 打开部署网址 → 分享 → 加入主画面。
- **Android：**用 Chrome 打开部署网址 → 浏览器菜单 → 安装应用 / 添加到主屏幕。
- 手机内的下注和记录只保存在该设备的浏览器中，不会自动同步到其他设备。
