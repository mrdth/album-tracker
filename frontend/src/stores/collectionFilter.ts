import { ref } from 'vue'

export type SortOption = 'name' | 'completion' | 'owned'
export type FilterOption = 'all' | 'incomplete' | 'complete'

const sortBy = ref<SortOption>('name')
const filterBy = ref<FilterOption>('all')

export function useCollectionFilter() {
  return {
    sortBy,
    filterBy,
  }
}
