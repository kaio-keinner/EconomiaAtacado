import { create } from 'zustand'

export interface ComparisonDraftItem {
  id: string
  nome: string
  quantidade: number
  precoOriginal?: number
}

interface ShoppingListState {
  items: ComparisonDraftItem[]
  addItem: (item: Omit<ComparisonDraftItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantidade: number) => void
  setItems: (items: ComparisonDraftItem[]) => void
  clearItems: () => void
}

export const useShoppingListStore = create<ShoppingListState>((set) => ({
  items: [
    { id: '1', nome: 'Arroz Branco 5kg', quantidade: 1 },
    { id: '2', nome: 'Feijão Carioca 1kg', quantidade: 2 },
    { id: '3', nome: 'Óleo de Soja 900ml', quantidade: 1 },
  ],
  addItem: (item) =>
    set((state) => ({
      items: [...state.items, { ...item, id: String(Date.now()) }],
    })),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),
  updateQuantity: (id, quantidade) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, quantidade: Math.max(1, quantidade) } : i)),
    })),
  setItems: (items) => set({ items }),
  clearItems: () => set({ items: [] }),
}))
