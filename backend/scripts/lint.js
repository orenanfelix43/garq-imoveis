const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function filesUnder(dir, extension) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const target = path.join(dir, entry.name);
        if (entry.isDirectory() && ['node_modules', 'dist', 'assets'].includes(entry.name)) return [];
        return entry.isDirectory() ? filesUnder(target, extension) : (target.endsWith(extension) ? [target] : []);
    });
}

const backendFiles = filesUnder(path.join(__dirname, '..', 'src'), '.js');
for (const file of backendFiles) execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });

const frontendRoot = path.join(__dirname, '..', '..', 'frontend');
const inlineHandler = /\son[a-z]+\s*=/i;
for (const file of filesUnder(frontendRoot, '.html')) {
    if (inlineHandler.test(fs.readFileSync(file, 'utf8'))) throw new Error(`Handler inline proibido: ${file}`);
}
for (const file of filesUnder(path.join(frontendRoot, 'src'), '.js')) {
    const source = fs.readFileSync(file, 'utf8');
    if (inlineHandler.test(source)) throw new Error(`Handler inline proibido: ${file}`);
    if (/localStorage\.setItem\([^)]*(token|auth)/i.test(source)) throw new Error(`Token em storage: ${file}`);
}
console.log(`Lint de segurança concluído em ${backendFiles.length} arquivos de backend.`);
