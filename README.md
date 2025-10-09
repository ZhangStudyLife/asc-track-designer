# 🏎️ ASC 智能车赛道设计器# 🎯 ASC赛道设计器 - 超简单使用指南



<div align="center">## 😊 给朋友的使用说明（不需要懂技术）



**专业的智能车赛道布局设计工具**### 🚀 第一次使用（只需要做一次）



[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/ZhangStudyLife/asc-track-designer)1. **下载Node.js**（如果电脑没有的话）

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)   - 访问：https://nodejs.org

[![Next.js](https://img.shields.io/badge/Next.js-15.0.3-black)](https://nextjs.org/)   - 点击绿色的"Download"按钮

[![Electron](https://img.shields.io/badge/Electron-28.3.3-blue)](https://www.electronjs.org/)   - 下载完成后双击安装（一路点"下一步"即可）



[功能特性](#-功能特性) • [快速开始](#-快速开始) • [开发指南](#-开发指南) • [打包发布](#-打包发布)2. **获取设计器文件夹**

   - 从朋友那里得到"ASC赛道设计器"文件夹

</div>   - 解压到桌面或任意位置



---### 🎮 每次使用（超简单）



## ✨ 功能特性1. **双击启动**

   - 进入"ASC赛道设计器"文件夹

### 🎯 核心功能   - 双击"启动ASC赛道设计器.bat"文件

- **拖拽式设计** - 直观的可视化赛道布局   

- **精确测量** - 支持吸附点间距离测量2. **等待打开**

- **智能吸附** - 自动对齐和连接赛道元件   - 黑色窗口会出现一些文字（正常现象）

- **自动补全** - 智能补充直道连接   - 等待1-2分钟（首次使用时间较长）

- **标准元件库** - 多种规格直道和弯道   - 浏览器会自动打开设计器



### 📐 赛道元件3. **开始设计**

   - 网页打开后就可以开始设计赛道了！

#### 直道系列   - 点击按钮添加赛道元件

- L25 (25cm) / L37.5 (37.5cm) / L50 (50cm)   - 拖拽移动和布局

- L75 (75cm) / L100 (100cm)

### 🛑 关闭程序

#### 弯道系列  

- R50-30° / R50-45° / R50-90° (半径 50cm)- 关闭浏览器标签页

- R70-45° (半径 70cm)- 在黑色窗口按任意键关闭

- R100-60° (半径 100cm)

### ❓ 遇到问题怎么办

### ⌨️ 快捷键

1. **双击.bat文件没反应**

| 功能 | 快捷键 |   - 说明没有安装Node.js

|------|--------|   - 按照第一步安装Node.js

| 缩放视图 | `Ctrl + 滚轮` |

| 移动画布 | `Ctrl + 拖动` 或 `右键拖动` |2. **浏览器没有自动打开**

| 旋转元件 | `Tab` (15°) |   - 手动打开浏览器

| 删除元件 | `Delete` |   - 地址栏输入：http://localhost:3000

| 适应屏幕 | `Ctrl + F` |

| 聚焦赛道 | `Ctrl + G` |3. **页面打不开**

| 回到初始 | `Home` |   - 检查黑色窗口是否还在运行

| 保存赛道 | `Ctrl + S` |   - 重新双击.bat文件

| 导入赛道 | `Ctrl + O` |

| 导出图片 | `Ctrl + E` |### 💡 小贴士



---- 设计的赛道会自动保存在浏览器中

- 可以导出PNG图片和JSON文件

## 🚀 快速开始- 支持快捷键操作（但用鼠标点击也完全OK）



### 方式一：下载已打包应用（推荐）---



1. 前往 [Releases](https://github.com/ZhangStudyLife/asc-track-designer/releases) 下载最新版本## 📦 打包成独立应用

2. 选择合适的版本：

   - **便携版** - `ASC赛道设计器 2.0.0.exe` (~73MB，无需安装)### 🎁 给想要独立EXE文件的用户

   - **安装版** - `ASC赛道设计器 Setup 2.0.0.exe` (~73MB，完整安装)

3. 运行程序开始使用如果你想把这个设计器打包成一个独立的 `.exe` 应用，可以分享给其他人使用而无需安装 Node.js：



### 方式二：从源码运行**简单方法：**

1. 双击 `打包成EXE.bat` 文件

```bash2. 等待 5-10 分钟（首次打包）

# 1. 克隆项目3. 打包完成后会自动打开 `dist` 文件夹

git clone https://github.com/ZhangStudyLife/asc-track-designer.git4. 找到 `ASC赛道设计器 Setup.exe` 安装包

cd asc-track-designer

**详细说明：**

# 2. 安装依赖- 📖 查看 `快速开始.md` - 完整的打包指南

npm install- 📖 查看 `打包说明.md` - 高级配置说明

- 📖 查看 `配置完成说明.md` - 配置详情

# 3. 开发模式运行

npm run dev**打包后的优势：**

- ✅ 无需安装 Node.js

# 或使用便捷脚本- ✅ 双击即可运行

# Windows: 双击 "启动ASC赛道设计器.bat"- ✅ 可以分享给任何人

```- ✅ 在任何 Windows 电脑上运行



------



## 💻 开发指南**🏆 ASC实验室出品 | 热爱技术 甘于奉献**


### 技术栈

- **前端**: Next.js 15.0.3 + React 18.3.1
- **桌面**: Electron 28.3.3
- **绘图**: Konva.js + React-Konva 18.2.10
- **样式**: Tailwind CSS 3.4.14
- **语言**: TypeScript 5.6.3

### 项目结构

```
asc-track-designer/
├── src/
│   ├── app/
│   │   ├── page.tsx          # 主应用组件
│   │   ├── layout.tsx        # 布局组件
│   │   └── globals.css       # 全局样式
│   └── types/
│       └── jsx.d.ts          # TypeScript 类型
├── public/
│   ├── lab-logo.png          # Logo (2112x2112)
│   └── icon.ico              # 应用图标
├── electron.js               # Electron 主进程
├── package.json              # 项目配置
└── README.md                 # 项目文档
```

### 开发命令

```bash
# 开发模式
npm run dev

# 构建静态网页
npm run build:web

# Windows 打包
npm run dist:win
```

---

## 📦 打包发布

### Windows 打包

```bash
# 使用脚本 (推荐)
双击 "打包成EXE.bat"

# 使用命令
npm run dist:win
```

### 打包产物

输出目录：`release/`

| 文件 | 说明 | 大小 |
|------|------|------|
| `ASC赛道设计器 2.0.0.exe` | 便携版 | ~73MB |
| `ASC赛道设计器 Setup 2.0.0.exe` | 安装程序 | ~73MB |

### 体积优化

- **优化前**: 500+ MB
- **优化后**: 73 MB ✅

---

## 🔧 常见问题

**Q: 打包后应用无法启动？**  
A: 关闭所有运行实例，删除 `release/` 目录后重新打包。

**Q: 如何更换应用图标？**  
A: 替换 `public/icon.ico` 文件，然后重新打包。

**Q: 测量结果不准确？**  
A: 确保元件已正确吸附连接，测量基于吸附点实际坐标。

---

## 📄 许可证

本项目采用 **MIT License** - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- **ASC 实验室 李文轩 进行了优化打包 , 张跃哲有这个想法 并做出来第一个版本**
- **Next.js / Electron / Konva.js**

---

## 📧 联系方式

- **项目地址**: [GitHub](https://github.com/ZhangStudyLife/asc-track-designer)
- **问题反馈**: [Issues](https://github.com/ZhangStudyLife/asc-track-designer/issues)

---

<div align="center">

**⭐ 如果这个项目对您有帮助，欢迎点 Star 支持！**

Made with ❤️ by ASC Lab

</div>
