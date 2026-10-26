'use strict';

const networkMath = (() => {
  const maxRanges = 256;
  const parseAddress = value => {
    const text = String(value || '').trim();
    if (!text || text.includes('%') || !ipaddr.isValid(text)) throw new Error('Adresse IP invalide.');
    const address = ipaddr.parse(text);
    if (address.kind() === 'ipv4' && !ipaddr.IPv4.isValidFourPartDecimal(text)) throw new Error('Une IPv4 doit contenir quatre nombres d\u00e9cimaux, sans z\u00e9ro initial.');
    return address;
  };
  const type = family => family === 'ipv4' ? ipaddr.IPv4 : ipaddr.IPv6;
  const integer = address => address.toByteArray().reduce((value, byte) => (value << 8n) + BigInt(byte), 0n);
  const fromInteger = (value, bits) => {
    const bytes = Array(bits / 8);
    let rest = value;
    for (let index = bytes.length - 1; index >= 0; index--) {
      bytes[index] = Number(rest & 255n);
      rest >>= 8n
    }
    return ipaddr.fromByteArray(bytes);
  };
  const parsePrefix = (value, bits) => {
    const text = String(value).trim().replace(/^\//, '');
    if (!/^\d+$/.test(text) || Number(text) > bits) throw new Error('Pr\u00e9fixe invalide : 0 \u00e0 ' + bits + '.');
    return Number(text);
  };
  const parseCIDR = value => {
    const text = String(value || '').trim(),
      parts = text.split('/');
    if (parts.length !== 2) throw new Error('Adresse et pr\u00e9fixe CIDR requis.');
    const address = parseAddress(parts[0]),
      family = address.kind(),
      bits = family === 'ipv4' ? 32 : 128,
      prefix = parsePrefix(parts[1], bits);
    const parsed = ipaddr.parseCIDR(address.toString() + '/' + prefix),
      api = type(family);
    const network = api.networkAddressFromCIDR(parsed[0].toString() + '/' + prefix),
      last = api.broadcastAddressFromCIDR(parsed[0].toString() + '/' + prefix);
    return {
      address,
      network,
      last,
      family,
      bits,
      prefix,
      cidr: network.toString() + '/' + prefix,
      size: 1n << BigInt(bits - prefix)
    };
  };
  const subnet = value => {
    const result = parseCIDR(value),
      api = type(result.family),
      ipv4 = result.family === 'ipv4';
    const mask = api.subnetMaskFromPrefixLength(result.prefix),
      reserved = ipv4 && result.prefix < 31;
    return {
      ...result,
      mask: mask.toString(),
      wildcard: ipv4 ? ipaddr.fromByteArray(mask.toByteArray().map(byte => 255 - byte)).toString() : null,
      broadcast: reserved ? result.last.toString() : null,
      hosts: ipv4 ? result.size - (reserved ? 2n : 0n) : null,
      firstHost: ipv4 ? fromInteger(integer(result.network) + (reserved ? 1n : 0n), result.bits).toString() : null,
      lastHost: ipv4 ? fromInteger(integer(result.last) - (reserved ? 1n : 0n), result.bits).toString() : null
    };
  };
  const mask = (value, family = 'ipv4') => {
    if (!['ipv4', 'ipv6'].includes(family)) throw new Error('Famille IP invalide.');
    const text = String(value || '').trim(),
      bits = family === 'ipv4' ? 32 : 128;
    let prefix;
    if (/^\/?\d+$/.test(text)) prefix = parsePrefix(text, bits);
    else {
      const address = parseAddress(text);
      if (address.kind() !== family) throw new Error('Le masque ne correspond pas \u00e0 la famille IP.');
      prefix = address.prefixLengthFromSubnetMask();
      if (prefix === null) throw new Error('Masque non contigu.');
    }
    const address = type(family).subnetMaskFromPrefixLength(prefix);
    return {
      family,
      bits,
      prefix,
      mask: address.toString(),
      wildcard: family === 'ipv4' ? ipaddr.fromByteArray(address.toByteArray().map(byte => 255 - byte)).toString() : null,
      size: 1n << BigInt(bits - prefix)
    };
  };
  const membership = (ip, cidr) => {
    const address = parseAddress(ip),
      range = parseCIDR(cidr),
      sameFamily = address.kind() === range.family;
    const belongs = sameFamily && address.match([range.network, range.prefix]);
    let role = '';
    if (belongs && range.family === 'ipv4') {
      role = range.prefix === 32 ? 'Adresse unique' : range.prefix === 31 ? 'Extr\u00e9mit\u00e9 point \u00e0 point' : address.toString() === range.network.toString() ? 'Adresse r\u00e9seau' : address.toString() === range.last.toString() ? 'Adresse broadcast' : 'Adresse h\u00f4te';
    }
    return {
      address: address.toString(),
      range,
      belongs,
      sameFamily,
      role
    };
  };
  const overlaps = value => {
    const lines = String(value || '').split(/\r?\n/).map((text, index) => ({
      text: text.trim(),
      line: index + 1
    })).filter(row => row.text);
    if (!lines.length) throw new Error('Aucune plage CIDR.');
    if (lines.length > maxRanges) throw new Error('Maximum ' + maxRanges + ' plages par analyse.');
    const ranges = lines.map(row => {
        try {
          return {
            ...parseCIDR(row.text),
            source: row.text,
            line: row.line
          }
        } catch (error) {
          throw new Error('Ligne ' + row.line + ' : ' + error.message)
        }
      }),
      pairs = [];
    for (let a = 0; a < ranges.length; a++)
      for (let b = a + 1; b < ranges.length; b++) {
        const first = ranges[a],
          second = ranges[b];
        if (first.family !== second.family) continue;
        const smaller = first.prefix >= second.prefix ? first : second,
          larger = smaller === first ? second : first;
        if (!smaller.network.match([larger.network, larger.prefix])) continue;
        pairs.push({
          first,
          second,
          intersection: smaller.cidr,
          relation: first.prefix === second.prefix ? 'Identiques' : first.prefix < second.prefix ? 'A contient B' : 'B contient A'
        });
      }
    return {
      ranges,
      pairs
    };
  };
  return {
    parseAddress,
    parseCIDR,
    subnet,
    mask,
    membership,
    overlaps,
    maxRanges
  };
})();
