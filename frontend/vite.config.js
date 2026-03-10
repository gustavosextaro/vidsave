import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 9000,
        proxy: {
            '/download': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/validate': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/health': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
        },
    },
})
