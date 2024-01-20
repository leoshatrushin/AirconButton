import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
    if (!mode) mode = 'dev';
    return {
        root: 'src',
        build: {
            outDir: '../dist',
            rollupOptions: {
                input: {
                    main: 'src/index.html',
                    login: 'src/login.html',
                },
            },
            minify: mode == 'prod',
            sourcemap: mode == 'dev',
            target: 'esnext',
        },
    };
});
