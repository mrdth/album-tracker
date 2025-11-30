<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  search: [searchTerm: string]
}>()

const searchTerm = ref('')

const handleSubmit = () => {
  if (searchTerm.value.trim()) {
    emit('search', searchTerm.value.trim())
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="w-full max-w-2xl">
    <div class="flex gap-3">
      <input
        v-model="searchTerm"
        type="text"
        placeholder="Search for an artist..."
        class="input flex-1"
        :disabled="loading"
        aria-label="Artist search"
      />
      <button type="submit" class="btn btn-primary" :disabled="loading || !searchTerm.trim()">
        {{ loading ? 'Searching...' : 'Search' }}
      </button>
    </div>
  </form>
</template>
