<template>
  <div>
    <LayoutAppHeader />
    <main class="container app-main">
      <slot />
    </main>
    <LayoutAppFooter />
    <CommonChatWidget />
  </div>
</template>
