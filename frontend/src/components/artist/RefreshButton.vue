<script setup lang="ts">
interface Props {
  isRefreshing: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<{
  refresh: []
}>()

function handleClick() {
  if (!props.isRefreshing && !props.disabled) {
    emit('refresh')
  }
}
</script>

<template>
  <button
    type="button"
    data-testid="refresh-button"
    class="text-sm px-4 py-2 text-green-700 bg-green-50 rounded-lg hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    :disabled="isRefreshing || disabled"
    @click="handleClick"
  >
    <svg
      v-if="!isRefreshing"
      class="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>

    <!-- Loading spinner -->
    <svg
      v-else
      data-testid="refresh-loading"
      class="w-4 h-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      ></circle>
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>

    <span>{{ isRefreshing ? 'Refreshing...' : 'Refresh Albums' }}</span>
  </button>
</template>
