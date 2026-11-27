<template>
  <main class="login-page" :class="{ 'login-page--classic': !simpleMode }">
    <div class="login-display-options">
      <label for="login-simple-mode">简约模式</label>
      <ElSwitch id="login-simple-mode" v-model="simpleMode" />
    </div>
    <div v-if="!simpleMode" class="login-orbs" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <section v-if="!simpleMode" class="login-story" aria-label="LuxuryImage">
      <a class="login-brand" href="#/login"><img src="/logo.svg" alt="" /><span>LuxuryImage</span></a>
      <div class="login-story-copy">
        <p class="login-eyebrow">YOUR CREATIVE WORKSPACE</p>
        <p class="login-story-title">让灵感，<br /><TypewriterText text="成为图像。" /></p>
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
    <div class="login-form-side">
      <div class="login-layout">
        <div v-if="simpleMode" class="login-brand">
          <img src="/logo.svg" width="32" height="32" alt="" />
          <span>LuxuryImage</span>
        </div>
        <section class="login-form-card" aria-labelledby="login-title">
          <header>
            <div v-if="!simpleMode" class="login-brand login-mobile-brand"><img src="/logo.svg" alt="" /><span>LuxuryImage</span></div>
            <p v-if="!simpleMode" class="login-eyebrow">WELCOME BACK</p>
            <h1 id="login-title">登录工作空间</h1>
            <p class="login-form-description">{{ simpleMode ? '支持管理员密钥和用户密钥。' : '输入管理密钥，继续你的创作与管理。' }}</p>
          </header>

          <form class="login-form" @submit.prevent="handleLogin">
            <div class="login-field">
              <label for="password" class="ui-field-label">{{ simpleMode ? '访问密钥' : '管理密钥' }}</label>
              <Input id="password" v-model="password" type="password" size="md" block
                :placeholder="simpleMode ? '输入密钥' : '输入 Bearer key'" :disabled="isLoading" />
            </div>
            <Button type="submit" size="md" variant="primary" block :loading="isLoading" :disabled="isLoading || !password">
              {{ isLoading ? '登录中…' : '登录' }}
              <Icon v-if="!simpleMode && !isLoading" icon="lucide:arrow-right" class="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
          <div v-if="!simpleMode" class="login-footer">
            <a :href="repositoryUrl" target="_blank" rel="noopener noreferrer">
              GitHub <Icon icon="lucide:arrow-up-right" class="inline h-3 w-3" aria-hidden="true" />
            </a>
            <span>LuxuryImage Console</span>
          </div>
        </section>
        <a v-if="simpleMode" class="login-source" :href="repositoryUrl" target="_blank" rel="noopener noreferrer">
          GitHub <Icon icon="lucide:arrow-up-right" class="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { ElSwitch } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { Button, Input } from '@/components/ui'
import TypewriterText from '@/components/ui/TypewriterText.vue'
import { useToast } from '@/composables/useToast'
import { getBooleanPreference, preferenceKeys, setBooleanPreference } from '@/lib/preferences'
import { resolveLoginRedirect } from '@/router/routes'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()

const repositoryUrl = 'https://github.com/why-qw1ko/chatgpt2api'
const simpleMode = ref(getBooleanPreference(preferenceKeys.loginSimpleMode))
const password = ref('')
const isLoading = ref(false)

watch(simpleMode, (value) => setBooleanPreference(preferenceKeys.loginSimpleMode, value))

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
    toast.error(error.message || '登录失败，请检查密钥。')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-page {
  position: relative;
  isolation: isolate;
  display: grid;
  min-height: 100dvh;
  grid-template-columns: minmax(0, 1fr);
  overflow: clip;
  padding: 64px 24px;
  background: hsl(var(--background));
}

.login-display-options {
  position: absolute;
  z-index: 2;
  inset-block-start: 20px;
  inset-inline-end: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: hsl(var(--muted-foreground));
  font-size: 14px;
  line-height: 20px;
}

.login-display-options label { cursor: pointer; }

.login-form-side {
  position: relative;
  z-index: 1;
  display: grid;
  min-width: 0;
  place-items: center;
}

.login-layout {
  display: grid;
  width: min(100%, 24rem);
  gap: 24px;
}

.login-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: hsl(var(--foreground));
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.login-form-card {
  display: grid;
  gap: 24px;
  padding: 32px;
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  background: hsl(var(--card));
  box-shadow: var(--shadow-soft);
}

.login-form-card h1 {
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
}

.login-form-description {
  margin-top: 8px;
  color: hsl(var(--muted-foreground));
  font-size: 14px;
  line-height: 20px;
}

.login-form,
.login-field {
  display: grid;
  gap: 16px;
}

.login-field { gap: 8px; }

.login-source {
  display: inline-flex;
  align-items: center;
  justify-self: center;
  gap: 4px;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  line-height: 16px;
}

.login-source:hover { color: hsl(var(--primary)); }

.login-page--classic {
  --background: 200 100% 98%;
  --foreground: 201 100% 6%;
  --card: 0 0% 100%;
  --primary: 205 100% 54%;
  --primary-foreground: 0 0% 100%;
  --muted-foreground: 202 12% 36%;
  --border: 203 30% 88%;
  --input: 203 24% 80%;
  --ring: var(--primary);
  --headline-color: #00141f;
  --body-color: #334552;
  --control-radius: 8px;
  --control-fill: hsl(var(--card));
  --control-hover: hsl(var(--card));
  --control-focus: hsl(var(--ring));
  --control-primary-hover: #0a72c9;
  --el-color-primary: hsl(var(--primary));
  --el-text-color-regular: var(--body-color);
  --el-text-color-placeholder: hsl(var(--muted-foreground) / 0.8);
  --shadow-floating: 0 8px 28px rgb(8 48 82 / 0.1);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  padding: 20px;
  font-family: 'Amiko', 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', sans-serif;
}

.login-story {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: calc(100dvh - 40px);
  flex-direction: column;
  overflow: hidden;
  padding: 42px clamp(24px, 4vw, 52px) 30px;
  border-radius: 24px;
  background:
    radial-gradient(circle at 82% 18%, rgb(185 255 71 / 0.35), transparent 28%),
    radial-gradient(circle at 18% 82%, rgb(255 179 117 / 0.32), transparent 32%),
    linear-gradient(155deg, #dff3ff 0%, #f5fbff 48%, #e8f7ff 100%);
}

.login-page--classic .login-brand {
  justify-content: flex-start;
  gap: 12px;
  font-size: 23px;
  font-weight: 700;
  letter-spacing: -0.05em;
  line-height: inherit;
}

.login-page--classic .login-brand img {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  box-shadow: 0 8px 20px rgb(20 157 255 / 0.28);
}

.login-story-copy { margin-top: clamp(46px, 8vh, 110px); }
.login-eyebrow { color: #0a72c9; font-size: 10px; font-weight: 700; letter-spacing: 0.18em; }
.login-story-title {
  margin: 22px 0;
  color: var(--headline-color);
  font-size: clamp(36px, 4.5vw, 68px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.035em;
}
.login-story-description { color: var(--body-color); font-size: 14px; line-height: 1.95; }
.login-art {
  width: min(100%, 520px);
  max-height: 32vh;
  min-height: 0;
  margin: auto auto 0;
  filter: drop-shadow(0 18px 30px rgb(8 48 82 / 0.12));
}
.login-story-footer { margin-top: 18px; color: hsl(var(--muted-foreground)); font-size: 11px; letter-spacing: 0.15em; }

.login-page--classic .login-form-side { padding: 40px; }
.login-page--classic .login-layout { width: min(100%, 360px); }
.login-page--classic .login-form-card {
  display: block;
  padding: 28px;
  border-radius: 20px;
  box-shadow: var(--shadow-floating);
}
.login-page--classic .login-form-card h1 { margin-top: 14px; font-size: 28px; font-weight: 700; line-height: 1.35; }
.login-page--classic .login-form-description { margin-top: 12px; font-size: 13px; line-height: 1.7; }
.login-page--classic .login-form { margin-top: 32px; gap: 24px; }
.login-mobile-brand { display: none; }

.login-page--classic :deep(.el-input__wrapper:not(.is-focus)) { box-shadow: inset 0 0 0 1px hsl(var(--input)); }
.login-page--classic :deep(.lux-button--primary) { font-weight: 600; }
.login-page--classic :deep(.lux-button--primary.is-disabled) {
  --el-button-disabled-bg-color: color-mix(in srgb, hsl(var(--primary)) 40%, hsl(var(--card)));
}

.login-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
  margin-top: 42px;
  padding-top: 24px;
  border-top: 1px solid hsl(var(--border));
  color: hsl(var(--muted-foreground));
  font-size: 11px;
}
.login-footer a:hover { color: hsl(var(--primary)); }

html[data-theme="dark"] .login-page--classic {
  --background: 203 30% 8%;
  --foreground: 200 40% 95%;
  --card: 203 24% 11%;
  --primary: 205 100% 58%;
  --primary-foreground: 203 40% 8%;
  --muted-foreground: 202 12% 68%;
  --border: 203 18% 20%;
  --input: 203 16% 28%;
  --headline-color: #f2f8fc;
  --body-color: #c2d2dc;
  --control-primary-hover: #7ec8ff;
  --shadow-floating: 0 8px 28px rgb(0 0 0 / 0.38);
}
html[data-theme="dark"] .login-story {
  background:
    radial-gradient(circle at 82% 18%, rgb(185 255 71 / 0.12), transparent 28%),
    radial-gradient(circle at 18% 82%, rgb(20 157 255 / 0.18), transparent 32%),
    linear-gradient(155deg, #0d2230 0%, #132b3a 50%, #0f2432 100%);
}
html[data-theme="dark"] .login-eyebrow { color: #7ec8ff; }

.login-orbs { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.login-orbs i {
  position: absolute;
  display: block;
  width: 38vw;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, rgb(104 172 255 / 0.28), rgb(104 172 255 / 0.06) 55%, transparent 70%);
}
.login-orbs i:nth-child(1) { top: -18%; right: -8%; }
.login-orbs i:nth-child(2) { width: 30vw; bottom: -10%; right: 20%; background: radial-gradient(circle, rgb(74 210 180 / 0.2), transparent 70%); }
.login-orbs i:nth-child(3) { width: 22vw; top: 30%; right: 1%; background: radial-gradient(circle, rgb(255 179 117 / 0.22), transparent 70%); }
.login-orbs i:nth-child(4) { width: 42vw; top: 40%; left: -10%; }

@media (prefers-reduced-motion: no-preference) {
  .login-orbs i { animation: login-float 16s var(--ease-spring) infinite alternate; }
  .login-orbs i:nth-child(2) { animation-duration: 21s; animation-delay: -7s; }
  .login-orbs i:nth-child(3) { animation-duration: 13s; animation-delay: -4s; }
  .login-orbs i:nth-child(4) { animation-duration: 25s; animation-delay: -12s; }
}
@keyframes login-float {
  from { transform: translate(-18px, -26px) scale(0.92); }
  to { transform: translate(30px, 34px) scale(1.08); }
}

@media (max-width: 767px) {
  .login-page,
  .login-page--classic {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    gap: 0;
    padding: 16px 24px 24px;
  }
  .login-display-options { position: relative; inset: auto; justify-self: end; }
  .login-story { display: none; }
  .login-page .login-form-side { padding: 16px 0 32px; }
  .login-mobile-brand { display: flex; margin-bottom: 56px; }
  .login-page--classic .login-form-card h1 { font-size: 25px; }
  .login-orbs i { width: 90vw; }
  .login-orbs i:nth-child(n+2) { width: 70vw; }
}

@media (max-width: 480px) {
  .login-page:not(.login-page--classic) { padding-inline: 16px; }
  .login-page:not(.login-page--classic) .login-form-card { padding: 24px; }
}
</style>
