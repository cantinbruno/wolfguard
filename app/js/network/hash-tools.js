'use strict';

const fileHashTools = (() => {
  const algorithms = {
    'SHA-256': {
      factory: 'createSHA256',
      length: 64
    },
    'SHA-384': {
      factory: 'createSHA384',
      length: 96
    },
    'SHA-512': {
      factory: 'createSHA512',
      length: 128
    },
    'SHA-1': {
      factory: 'createSHA1',
      length: 40
    },
    MD5: {
      factory: 'createMD5',
      length: 32
    }
  };
  const chunkSize = 2 * 1024 * 1024;
  const algorithmForHash = hash => Object.keys(algorithms).find(name => algorithms[name].length === hash.length);
  const algorithmName = value => String(value).toUpperCase().replace(/^SHA-?(\d+)$/, 'SHA-$1');
  const basename = name => name.replace(/\\/g, '/').split('/').pop();
  const entry = (hash, name = '', algorithm = '') => {
    hash = hash.toLowerCase();
    const detected = algorithmForHash(hash);
    if (!detected || algorithm && algorithmName(algorithm) !== detected) throw new Error('Somme de contr\u00f4le invalide.');
    return {
      hash,
      name,
      algorithm: detected
    };
  };
  const parseChecksums = value => {
    const text = String(value || '').trim();
    if (!text) return [];
    const entries = [];
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed === '-----BEGIN PGP SIGNATURE-----') break;
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
      let match = trimmed.match(/^(MD5|SHA-?(?:1|256|384|512))\s*\((.+)\)\s*=\s*([a-f0-9]+)$/i);
      if (match) {
        entries.push(entry(match[3], match[2], match[1]));
        continue
      }
      match = trimmed.match(/^(MD5|SHA-?(?:1|256|384|512))\s*[:=]\s*([a-f0-9]+)$/i);
      if (match) {
        entries.push(entry(match[2], '', match[1]));
        continue
      }
      match = trimmed.match(/^(MD5|SHA-?(?:1|256|384|512))\s+([a-f0-9]+)(?:\s+(.+))?$/i);
      if (match) {
        entries.push(entry(match[2], match[3] || '', match[1]));
        continue
      }
      match = trimmed.match(/^(\\?)([a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64}|[a-f0-9]{96}|[a-f0-9]{128})[ \t]+\*?(.+)$/i);
      if (match) {
        const name = match[1] ? match[3].replace(/\\([\\nr])/g, (_, character) => character === 'n' ? '\n' : character === 'r' ? '\r' : '\\') : match[3];
        entries.push(entry(match[2], name));
        continue;
      }
      if (/^[a-f0-9]+(?:[\s:-]+[a-f0-9]+)*$/i.test(trimmed)) {
        const compact = trimmed.replace(/[\s:-]/g, '');
        if (algorithmForHash(compact)) entries.push(entry(compact));
      }
    }
    if (!entries.length) throw new Error('Aucune somme de contr\u00f4le valide. V\u00e9rifie le hash attendu.');
    return entries;
  };
  const resolveExpected = (value, algorithm = 'auto', filename = '') => {
    if (algorithm !== 'auto' && !algorithms[algorithm]) throw new Error('Algorithme de hachage inconnu.');
    let entries = parseChecksums(value);
    if (!entries.length) return {
      hash: '',
      name: '',
      algorithm: algorithm === 'auto' ? 'SHA-256' : algorithm
    };
    const named = entries.filter(item => item.name);
    if (named.length) {
      if (filename) {
        entries = named.filter(item => basename(item.name) === filename);
        if (!entries.length) entries = named.filter(item => basename(item.name).toLowerCase() === filename.toLowerCase());
        if (!entries.length) throw new Error('Aucune somme de contr\u00f4le pour \u00ab ' + filename + ' \u00bb.');
      } else {
        if (new Set(named.map(item => item.name)).size > 1) throw new Error('S\u00e9lectionne un fichier pr\u00e9sent dans cette liste.');
        entries = named;
      }
    }
    if (algorithm !== 'auto') {
      entries = entries.filter(item => item.algorithm === algorithm);
      if (!entries.length) throw new Error('Le hash attendu ne correspond pas au format ' + algorithm + '.');
    }
    if (new Set(entries.map(item => item.algorithm + ':' + item.hash)).size > 1) throw new Error('Plusieurs sommes de contr\u00f4le possibles. Choisis un algorithme ou une seule ligne.');
    return entries[0];
  };
  const normalizeExpected = (value, algorithm, filename) => resolveExpected(value, algorithm, filename).hash;
  const compare = (hash, expected, algorithm, filename) => {
    const normalized = normalizeExpected(expected, algorithm, filename);
    return {
      expected: normalized,
      match: normalized ? hash.toLowerCase() === normalized : null
    };
  };
  const digest = async (file, algorithm, {
    signal,
    onProgress
  } = {}) => {
    if (!algorithms[algorithm]) throw new Error('Algorithme de hachage inconnu.');
    const checkAborted = () => {
      if (signal?.aborted) throw new DOMException('Calcul annul\u00e9.', 'AbortError')
    };
    checkAborted();
    const hasher = await hashwasm[algorithms[algorithm].factory]();
    checkAborted();
    onProgress?.({
      loaded: 0,
      total: file.size
    });
    // Bound memory use and yield between blocks so large downloads remain cancellable.
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      checkAborted();
      const end = Math.min(offset + chunkSize, file.size);
      const bytes = new Uint8Array(await file.slice(offset, end).arrayBuffer());
      checkAborted();
      if (bytes.length !== end - offset) throw new Error('Lecture du fichier incompl\u00e8te. S\u00e9lectionne-le \u00e0 nouveau.');
      hasher.update(bytes);
      onProgress?.({
        loaded: end,
        total: file.size
      });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    checkAborted();
    const result = hasher.digest('hex');
    onProgress?.({
      loaded: file.size,
      total: file.size
    });
    return result;
  };
  const checksum = (hash, filename) => {
    const escaped = /[\\\n\r]/.test(filename);
    const name = filename.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    return (escaped ? '\\' : '') + hash + '  ' + name + '\n';
  };
  return {
    algorithms,
    chunkSize,
    digest,
    parseChecksums,
    resolveExpected,
    normalizeExpected,
    compare,
    checksum
  };
})();
