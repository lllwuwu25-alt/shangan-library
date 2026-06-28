import { Copy, MessageCircle, Sparkles } from 'lucide-react'
import contactQr from '../assets/contact-qr.jpg'
import { PageHeader } from '../components/Layout'
import { Button, Card, Panel, SectionTitle } from '../components/ui'

export function Contact() {
  const copyWechat = async () => {
    await navigator.clipboard?.writeText('zycang999')
  }

  return (
    <>
      <PageHeader title="联系我们" description="如果这个本地备考系统对你有帮助，欢迎反馈真实使用体验。你的建议可能会成为下一版功能。" />
      <div className="space-y-5">
        <Card className="overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="p-6 sm:p-8 lg:p-9">
              <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <MessageCircle size={24} />
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950 2xl:text-2xl">你的真实备考需求，会成为下一版功能</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                如果您使用得不错，欢迎联系我们。我们会优先邀请活跃用户更快、免费体验更多有趣的新功能，也欢迎你提出真实备考场景里的需求和建议。
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Panel>
                  <Sparkles size={17} className="mb-2 text-blue-600" />
                  <p className="text-sm font-medium text-slate-900">功能建议</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">想要学习计划、资料库、错题本增加什么功能？</p>
                </Panel>
                <Panel>
                  <MessageCircle size={17} className="mb-2 text-emerald-600" />
                  <p className="text-sm font-medium text-slate-900">使用反馈</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">哪里不顺手、哪里看不懂、哪里操作麻烦？</p>
                </Panel>
                <Panel>
                  <Copy size={17} className="mb-2 text-amber-600" />
                  <p className="text-sm font-medium text-slate-900">内测共创</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">新功能上线前，优先邀请真实用户体验。</p>
                </Panel>
              </div>
            </div>
            <div className="bg-slate-50 p-6 ring-1 ring-slate-200/70 lg:ring-y-0 lg:ring-r-0">
              <div className="mx-auto max-w-xs rounded-3xl bg-white p-4 shadow-card ring-1 ring-slate-200/70">
                <img src={contactQr} alt="微信二维码" className="aspect-square w-full rounded-2xl object-cover" />
              </div>
              <div className="mx-auto mt-4 max-w-xs rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
                <p className="text-xs text-slate-500">微信号</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-lg font-semibold tracking-tight text-slate-950">zycang999</p>
                  <Button type="button" onClick={copyWechat}><Copy size={15} />复制</Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <SectionTitle title="适合联系的情况" />
          <div className="grid gap-3 text-sm leading-6 text-slate-600 md:grid-cols-3">
            <Panel>你希望更快体验后续版本的新功能。</Panel>
            <Panel>你在备考计划、资料整理、错题复盘里遇到了实际问题。</Panel>
            <Panel>你想把这套系统用于自己的学习资料产品或社群服务。</Panel>
          </div>
        </Card>
      </div>
    </>
  )
}
