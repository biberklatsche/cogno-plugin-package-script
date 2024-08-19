const path = require('path');
const fs = require('fs');
const os = require('os');

let cacheTime;
let cache = undefined;
const maxCacheInMillis = 60 * 1000;


function createHash(inputString) {
    let hash = 0;
    if (inputString.length === 0) {
        return hash.toString(10);
    }
    for (let i = 0; i < inputString.length; i++) {
        const char = inputString.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash &= hash; // Ensure 32-bit signed integer
    }
    return hash.toString(10);
}

function isLinuxSubsystem(dirs) {
    return os.platform() === 'win32' && dirs[0] == 'mnt';
}

function constructSearchDir(dirs) {
    const directories = isLinuxSubsystem(dirs) ? dirs.slice(1) : dirs;
    if(os.platform() === 'win32') {
        const drive = directories[0];
        const path = directories.reduce((a, v, currentIndex) => currentIndex === 0 ? '' : (currentIndex > 1 ? a : '') + (currentIndex > 1 ? '\\' : '') + v.replace(' ', '` '), '');
        return `${drive}:\\${path}`;
    } else {
        return directories.reduce((a, v, currentIndex) => a + '/' + v.replace(' ', '\\ '), '');
    }
}

function readScriptFromPackageJson(packageJsonPath) {
    try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath));
        if(packageJson.scripts) {
            return Object.keys(packageJson.scripts);
        }
        return [];
    } catch(e) {
        return [];
    }
}

/**
 *
 * @param {{location: Location; directories: string[]; placeholderInfo: {input: string}, currentInput: {input: string; startLine: number; lines: {line: number; content: string}[]}; cursorPosition: CursorPosition; pressedKey: string;}} data
 * @returns
 */
async function suggest(data) {
    if(data?.placeholderInfo === undefined) {return [];}
    const dir = constructSearchDir(data.directories);
    const packageJsonPath = path.join(dir, 'package.json');

    if(!cache || Date.now() - cacheTime > maxCacheInMillis){
        cache = {};
        cacheTime = Date.now();
    }
    const hash = createHash(packageJsonPath);
    let scripts;
    if(!!cache[hash]) {
        scripts = cache[hash];
    } else {
        scripts = readScriptFromPackageJson(packageJsonPath);
        cache[hash] = scripts;
    }
    const partOfScriptName = data.placeholderInfo.input.trim();
    const filter = scripts.filter((key) => key.startsWith(partOfScriptName));
    return filter.map(f => ({label: f, command: f}));
}

module.exports = {suggest};
