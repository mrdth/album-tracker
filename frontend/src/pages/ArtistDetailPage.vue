<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
const artistId = route.params.artistId;
</script>

<template>
  <div class="px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-6">Artist Detail</h1>
    <p class="text-gray-600">
      Artist ID: {{ artistId }}
    </p>
    <p class="text-gray-600 mt-2">
      Artist detail view will be implemented in Phase 3 (User Story 1).
    </p>
  </div>
</template>
