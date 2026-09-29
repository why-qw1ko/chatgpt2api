<template>
  <main class="login-page">
    <section class="login-story" aria-label="LuxuryImage">
      <a class="login-brand" href="#/login"><img src="/logo.svg" alt="" /><span>LuxuryImage</span></a>
      <div class="login-story-copy">
        <p class="login-eyebrow">YOUR CREATIVE WORKSPACE</p>
        <h1>让灵感，<br />成为图像。</h1>
        <p class="login-story-description">从对话到创作，从灵感到管理。<br />在一个工作空间里，有序展开。</p>
      </div>
      <svg class="login-art" viewBox="0 0 520 290" fill="none" aria-hidden="true">
        <rect x="66" y="64" width="278" height="182" rx="16" fill="#8ecfff" transform="rotate(-8 66 64)" />
        <rect x="154" y="46" width="278" height="190" rx="16" fill="white" stroke="#0b3a58" stroke-width="2" transform="rotate(6 154 46)" />
        <circle cx="349" cy="108" r="27" fill="#ffb375" />
        <path d="m173 203 67-76 38 43 26-24 93 75-224-18Z" fill="#149dff" stroke="#0b3a58" stroke-width="2" stroke-linejoin="round" />
        <path d="m430 24 7 20 21 7-21 7-7 20-7-20-20-7 20-7Z" fill="#b9ff47" stroke="#0b3a58" stroke-width="2" />
        <circle cx="78" cy="250" r="8" fill="#149dff" /><path d="M109 268h80" stroke="#0b3a58" stroke-width="2" stroke-linecap="round" />
      </svg>
      <p class="login-story-footer">对话 · 图像 · 工作空间</p>
    </section>
    <section class="login-form-side">
      <div class="login-form-card">
        <div class="login-mobile-brand"><img src="/logo.svg" alt="" /><span>LuxuryImage</span></div>
        <p class="login-eyebrow">WELCOME BACK</p>
        <h2>登录工作空间</h2>
        <p class="login-form-description">输入管理密钥，继续你的创作与管理。</p>
        <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
          <div class="space-y-2.5">
            <label for="password" class="ui-field-label">管理密钥</label>
            <Input id="password" v-model="password" type="password" size="md" block
              placeholder="输入 Bearer key" :disabled="isLoading" />
          </div>
          <Button type="submit" size="md" variant="primary" block :disabled="isLoading || !password">
            {{ isLoading ? '登录中...' : '登录' }}
            <Icon v-if="!isLoading" icon="lucide:arrow-right" class="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
        <div class="login-footer"><a href="https://github.com/" target="_blank" rel="noopener noreferrer">GitHub <Icon icon="lucide:arrow-up-right" class="inline h-3 w-3" aria-hidden="true" /></a><span>LuxuryImage Console</span></div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Input } from '@/components/ui'
import { useToast } from '@/composables/useToast'
import { resolveLoginRedirect } from '@/router/routes'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()

const password = ref('')
const isLoading = ref(false)

async function handleLogin() {
  if (!password.value) return

  isLoading.value = true

  try {
    const loggedIn = await authStore.login(password.value)
    if (!loggedIn) {
      toast.error('密钥无效或已失效。')
      return
    }
    await router.replace(resolveLoginRedirect(route.query.redirect, authStore.homeRoute))
  } catch (error: any) {
    toast.error(error.message || '登录失败，请检查密码。')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-page { display: grid; min-height: 100dvh; grid-template-columns: 1fr 1fr; padding: 20px; gap: 20px; background: hsl(var(--background)); }
.login-story {
  position: relative;
  min-height: calc(100dvh - 40px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 42px 52px 30px;
  border-radius: 24px;
  background:
    radial-gradient(circle at 82% 18%, rgb(185 255 71 / 0.35), transparent 28%),
    radial-gradient(circle at 18% 82%, rgb(255 179 117 / 0.32), transparent 32%),
    linear-gradient(155deg, #dff3ff 0%, #f5fbff 48%, #e8f7ff 100%);
  color: #00141f;
}
.login-brand, .login-mobile-brand { display: flex; align-items: center; gap: 12px; font-size: 23px; font-weight: 700; letter-spacing: -0.05em; }
.login-brand img, .login-mobile-brand img { width: 38px; height: 38px; border-radius: 10px; box-shadow: 0 8px 20px rgb(20 157 255 / 0.28); }
.login-story-copy { margin-top: clamp(46px, 8vh, 110px); position: relative; z-index: 1; }
.login-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.18em; color: #0a72c9; }
.login-story h1 { margin: 22px 0; font-size: clamp(36px, 4.5vw, 68px); font-weight: 700; line-height: 1.2; color: #00141f; }
.login-story-description { font-size: 14px; line-height: 1.95; color: #334552; }
.login-art { width: min(100%, 520px); margin: auto auto 0; flex-shrink: 1; min-height: 0; max-height: 32vh; filter: drop-shadow(0 18px 30px rgb(8 48 82 / 0.12)); }
.login-story-footer { margin-top: 18px; font-size: 11px; letter-spacing: 0.15em; color: #5a7180; }
.login-form-side { display: flex; align-items: center; justify-content: center; padding: 40px; }
.login-form-card {
  width: 100%;
  max-width: 360px;
  padding: 28px;
  border: 1px solid hsl(var(--border));
  border-radius: 20px;
  background: hsl(var(--card));
  box-shadow: var(--shadow-floating);
}
.login-form-card h2 { margin-top: 14px; font-size: 28px; font-weight: 700; line-height: 1.35; }
.login-form-description { margin-top: 12px; font-size: 13px; line-height: 1.7; color: hsl(var(--muted-foreground)); }
.login-footer { display: flex; justify-content: space-between; gap: 16px; margin-top: 42px; padding-top: 24px; border-top: 1px solid hsl(var(--border)); font-size: 11px; color: hsl(var(--muted-foreground)); }
.login-footer a:hover { color: hsl(var(--primary)); }
.login-mobile-brand { display: none; }
:global(html[data-theme="dark"]) .login-story {
  background:
    radial-gradient(circle at 82% 18%, rgb(185 255 71 / 0.12), transparent 28%),
    radial-gradient(circle at 18% 82%, rgb(20 157 255 / 0.18), transparent 32%),
    linear-gradient(155deg, #0d2230 0%, #132b3a 50%, #0f2432 100%);
}
:global(html[data-theme="dark"]) .login-story h1, :global(html[data-theme="dark"]) .login-brand { color: #f2f8fc; }
:global(html[data-theme="dark"]) .login-eyebrow { color: #7ec8ff; }
:global(html[data-theme="dark"]) .login-story-description, :global(html[data-theme="dark"]) .login-story-footer { color: #a8c0cf; }
@media (max-width: 767px) {
  .login-page { display: flex; padding: 24px; }
  .login-story { display: none; }
  .login-form-side { width: 100%; padding: 20px 0; }
  .login-mobile-brand { display: flex; margin-bottom: 56px; color: hsl(var(--foreground)); }
  .login-form-card h2 { font-size: 25px; }
}
</style>
