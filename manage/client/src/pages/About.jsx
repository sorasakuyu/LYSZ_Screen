import { Info, ExternalLink, Heart } from 'lucide-react'
import poweredWithCynara from '../img/PoweredWithCynara.png'

export default function About() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          关于 <span className="text-cyan-600">Kaguya</span>
        </h1>
      </div>

      <div className="glass rounded-xl p-4 border-l-4 border-cyan-500 w-full">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Info className="w-4 h-4 text-cyan-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Tips</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Kaguya是动漫《超时空辉夜姬！》（日语：超かぐや姫！ 英语：Cosmic Princess Kaguya!）中的角色。
              辉夜（かぐや (Kaguya)）是来自月亮的神秘少女。为了寻找乐趣，决定试着在虚拟空间「月夜见」进行主播活动。活力十足，性格奔放。最喜欢彩叶了。
              <br />
              《超时空辉夜姬！》是Studio Colorido与STUDIO CHROMATO制作的原创网络动画电影，于2026年1月22日由网飞独占上映，并有小说、漫画等衍生作品。具体内容请见{" "}<a href="https://mzh.moegirl.org.cn/%E8%B6%85%E6%97%B6%E7%A9%BA%E8%BE%89%E5%A4%9C%E5%A7%AC%EF%BC%81" className="text-cyan-600 hover:text-cyan-500 inline-flex items-center gap-1 transition-colors">这里<ExternalLink className="w-3 h-3" /></a>{" "}。
            </p>
          </div>
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden h-40 w-full">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/80 via-purple-600/80 to-pink-600/80" />
        <div className="absolute inset-0 bg-[url('https://pixiv.sorasaku.vip/img-original/img/2024/07/04/08/21/57/120224003_p0.png')] bg-cover bg-center opacity-30" />
        <div className="relative z-10 p-6 h-full flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-white mb-2">Kaguya</h2>
          <p className="text-white/80 text-sm">BigScreen System</p>
          <p className="text-white/60 text-xs mt-1">Developed by {" "}<a href="https://www.sorasaku.vip" className="text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1 transition-colors">SorasakuYu(张家赫)<ExternalLink className="w-3 h-3" /></a>{" "}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800">
          非常感谢您选择Kaguya
        </h2>

        <div className="glass rounded-xl p-4">
          <h3 className="font-semibold text-gray-800 mb-3">开发团队：</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-500">{" "}<a href="https://www.sorasaku.vip" className="text-cyan-600 hover:text-cyan-500 inline-flex items-center gap-1 transition-colors">SorasakuYu<ExternalLink className="w-3 h-3" /></a>{" "}</span>
          </div>
        </div>

        <div className="text-sm text-gray-500 space-y-2">
          <p>
            <span className="text-gray-700">特别提示：</span>
            Kaguya后端由SorasakuYu开发，大屏端由SorasakuYu全栈开发，管理端由SorasakuYu设计，Kimi-K2.5和GLM-5人工智能大模型编写。
          </p>
          <p>
            Kaguya使用的全部软件均为原创，不包含任何第三方软件或开源组件。
          </p>
        </div>

        <div className="text-xs text-gray-400 space-y-1 pt-4 border-t border-gray-200">
          <p>Copyright © 2026 {" "}<a href="https://www.sorasaku.vip" className="text-cyan-600 hover:text-cyan-500 inline-flex items-center gap-1 transition-colors">SorasakuYu(张家赫)<ExternalLink className="w-3 h-3" /></a>{" "} . All rights reserved.</p>
          <p>软件部分图标来自Pixiv</p>
          <p>|Logo改自141302018|</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <a href="https://www.cynara.my/" target="_blank" rel="noopener noreferrer">
          <img 
            src={poweredWithCynara} 
            alt="Powered with Cynara" 
            className="h-16 object-contain"
          />
        </a>
      </div>
    </div>
  )
}
