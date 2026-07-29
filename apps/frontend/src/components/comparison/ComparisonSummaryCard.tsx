import { BuildingStorefrontIcon, SparklesIcon } from '@heroicons/react/24/outline'

interface ComparisonSummaryProps {
  totalAtacadao: number
  totalBigMaster: number
  economiaTotal: number
  melhorOpcao: 'atacadao' | 'bigmaster' | 'empate'
}

export function ComparisonSummaryCard({
  totalAtacadao,
  totalBigMaster,
  economiaTotal,
  melhorOpcao,
}: ComparisonSummaryProps) {
  return (
    <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-6 text-left">
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wider text-blue-300 font-bold flex items-center gap-1">
          <SparklesIcon className="w-4 h-4 text-amber-400" /> Resultado da Comparação
        </span>
        <h3 className="text-xl font-extrabold">
          {melhorOpcao === 'atacadao' && 'O Atacadão é a melhor opção para a sua lista!'}
          {melhorOpcao === 'bigmaster' && 'O BigMaster é a melhor opção para a sua lista!'}
          {melhorOpcao === 'empate' && 'Empate! Ambos os mercados possuem o mesmo custo total.'}
        </h3>
        <p className="text-xs text-slate-300">
          Economia estimada de <span className="font-bold text-emerald-400">R$ {economiaTotal.toFixed(2)}</span> optando pela melhor oferta.
        </p>
      </div>

      <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-lg border border-white/10">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-300 font-bold uppercase flex items-center gap-1">
            <BuildingStorefrontIcon className="w-3.5 h-3.5" /> Atacadão
          </span>
          <span className={`text-base font-extrabold ${melhorOpcao === 'atacadao' ? 'text-emerald-400' : 'text-white'}`}>
            R$ {totalAtacadao.toFixed(2)}
          </span>
        </div>
        <div className="h-8 w-px bg-white/20" />
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-300 font-bold uppercase flex items-center gap-1">
            <BuildingStorefrontIcon className="w-3.5 h-3.5" /> BigMaster
          </span>
          <span className={`text-base font-extrabold ${melhorOpcao === 'bigmaster' ? 'text-emerald-400' : 'text-white'}`}>
            R$ {totalBigMaster.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}
