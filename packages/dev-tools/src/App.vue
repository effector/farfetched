<script setup>
import { useUnit, useVModel } from 'effector-vue/composition';

import { $visible, show, hide } from './view-model/visibility';
import { operationHeaders, $operationsList } from './view-model/list';
import { $search } from './view-model/search';
import './view-model/console';
import FloatingButton from './ui/FloatingButton.vue';
import Modal from './ui/Modal.vue';
import Table from './ui/Table.vue';
import Search from './ui/Search.vue';

const { visible, handleButtonClick, handleOverlayClick, operationsList } =
  useUnit({
    visible: $visible,
    handleButtonClick: show,
    handleOverlayClick: hide,
    operationsList: $operationsList,
  });

const search = useVModel($search);
</script>

<template>
  <div class="ff">
    <FloatingButton @click="handleButtonClick">FF DevTools</FloatingButton>
    <Modal :visible="visible" @overlay-click="handleOverlayClick">
      <h2 class="title">
        Farfetched DevTools (Tech Preview)
        <Search v-model="search" />
      </h2>
      <Table :headers="operationHeaders" :items="operationsList" />
    </Modal>
  </div>
</template>

<style scoped>
.ff {
  position: absolute;

  & * {
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, Roboto, Inter, Helvetica,
      Arial, sans-serif;
  }
}

.title {
  display: flex;
  gap: 8px;
}
</style>
