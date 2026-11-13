import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/global.css'

const app = createApp(App)

// 兜底：单个页面渲染/运行时异常不再导致白屏，控制台保留完整堆栈
app.config.errorHandler = (err, instance, info) => {
  console.error('[app error]', info, err)
}

app.use(router).mount('#app')
