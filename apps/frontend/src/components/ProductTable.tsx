import { useState, useMemo } from 'react'
import { MagnifyingGlassIcon, XMarkIcon, PhotoIcon, CubeIcon } from '@heroicons/react/24/outline'
import { getImageUrl } from '../api/client'

export interface Product {
  id: number
  sku: string | null
  nome: string
  marca: string | null
  disponivel: boolean
  precoVarejo: number | null
  precoAtacado: number | null
  quantidadeMinimaAtacado: number | null
  imagemUrl: string | null
  origem?: string
  categoria1?: string
  categoria2?: string
}

export function ProductTable({ products }: { products: Product[] }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products
    const lower = searchTerm.toLowerCase()
    return products.filter((p) => 
      p.nome.toLowerCase().includes(lower) || 
      (p.marca && p.marca.toLowerCase().includes(lower)) ||
      (p.sku && p.sku.toLowerCase().includes(lower))
    )
  }, [products, searchTerm])

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 bg-white border border-gray-200 rounded-xl px-6">
        <CubeIcon className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-base font-bold text-gray-800">Nenhum produto cadastrado no banco de dados.</p>
        <p className="text-xs text-gray-400 mt-1 max-w-sm leading-relaxed">Preencha o formulário acima e inicie uma coleta para carregar dados do Atacadão.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col text-left">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-gray-200">
        <h2 className="text-sm font-bold text-gray-900">Produtos Coletados ({filteredProducts.length})</h2>
        <div className="relative flex items-center">
          <input
            className="pl-4 pr-10 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:border-blue-500 w-56 transition-all"
            placeholder="Filtrar por nome, marca ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="absolute right-8 text-gray-400 hover:text-gray-600 text-xs p-1 cursor-pointer" onClick={() => setSearchTerm('')}>
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          )}
          <MagnifyingGlassIcon className="absolute right-3 text-gray-400 w-4 h-4" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs font-sans">
          <thead>
            <tr>
              <th className="bg-gray-50 border-b border-gray-200 p-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-16">Imagem</th>
              <th className="bg-gray-50 border-b border-gray-200 p-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Produto</th>
              <th className="bg-gray-50 border-b border-gray-200 p-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Marca / SKU</th>
              <th className="bg-gray-50 border-b border-gray-200 p-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Preço Varejo</th>
              <th className="bg-gray-50 border-b border-gray-200 p-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Preço Atacado</th>
              <th className="bg-gray-50 border-b border-gray-200 p-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => (
              <tr key={p.id} className={!p.disponivel ? 'opacity-60' : ''}>
                <td className="p-3 border-b border-gray-100 align-middle text-center">
                  {p.imagemUrl ? (
                    <img className="w-10 h-10 object-contain mx-auto rounded border border-gray-100 bg-white" src={getImageUrl(p.imagemUrl) || ''} alt={p.nome} loading="lazy" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-50 flex items-center justify-center rounded border border-gray-100 text-gray-300 mx-auto">
                      <PhotoIcon className="w-6 h-6" />
                    </div>
                  )}
                </td>
                <td className="p-3 border-b border-gray-100 align-middle">
                  <div className="font-bold text-gray-800 line-clamp-2 leading-snug" title={p.nome}>{p.nome}</div>
                </td>
                <td className="p-3 border-b border-gray-100 align-middle">
                  <div className="font-semibold text-gray-700">{p.marca ?? '-'}</div>
                  <div className="text-[10px] text-gray-400 font-mono mt-0.5">SKU: {p.sku ?? 'N/A'}</div>
                </td>
                <td className="p-3 border-b border-gray-100 align-middle text-right font-semibold text-gray-700">
                  {p.precoVarejo ? `R$ ${p.precoVarejo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                </td>
                <td className="p-3 border-b border-gray-100 align-middle text-right">
                  {p.precoAtacado ? (
                    <div>
                      <div className="font-bold text-blue-600">
                        R$ {p.precoAtacado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-gray-400 font-medium">
                        Mín. {p.quantidadeMinimaAtacado} un.
                      </div>
                    </div>
                  ) : '-'}
                </td>
                <td className="p-3 border-b border-gray-100 align-middle text-center">
                  <span className={`inline-block text-[10px] font-bold py-1 px-2.5 rounded-full text-center ${p.disponivel ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {p.disponivel ? 'Disponível' : 'Indisponível'}
                  </span>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400 text-xs italic">
                  Nenhum produto corresponde à busca "{searchTerm}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
