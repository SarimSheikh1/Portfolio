import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({root:'client',plugins:[react(),tailwindcss()],css:{postcss:{plugins:[]}},server:{host:'127.0.0.1',port:8787,proxy:{'/api':'http://127.0.0.1:3001','/media':'http://127.0.0.1:3001'}},build:{outDir:'dist',chunkSizeWarningLimit:800}});
