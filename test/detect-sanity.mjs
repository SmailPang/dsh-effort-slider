// Standalone sanity check of the widget's pane-detection logic against a
// realistic native effort-pane DOM fragment (mirrors widget.js helpers).
const rowsHtml = [
  '<button role="menuitemradio" aria-checked="false"><span><span>Default</span></span></button>',
  '<button role="menuitemradio" aria-checked="false"><span><span>Off</span></span></button>',
  '<button role="menuitemradio" aria-checked="true"><span><span>High</span></span></button>',
  '<button role="menuitemradio" aria-checked="false"><span><span>Low</span></span></button>',
  '<button role="menuitemradio" aria-checked="false"><span><span>Max</span></span></button>',
].join('')
const labels = [...rowsHtml.matchAll(/<button role="menuitemradio" aria-checked="(\w+)"><span><span>([^<]+)<\/span><\/span>/g)].map((m) => ({
  checked: m[1],
  label: m[2],
}))
console.log('rows parsed:', JSON.stringify(labels))
const canonical = labels.filter((r) => /^(off|low|high|max)$/i.test(r.label)).length
const hasDefault = labels.some((r) => /^default$/i.test(r.label))
console.log('canonicalCount:', canonical, 'hasDefault:', hasDefault, '=> isComposerSeatMenu:', canonical >= 2 || (hasDefault && labels.length > 1))
const checked = labels.find((r) => r.checked === 'true')
console.log('checked row ->', checked && checked.label)

// The native catalog is not guaranteed to render in increasing effort order.
// The slider must still be Faster -> Smarter.
const order = { off: 0, low: 1, high: 2, max: 3 }
const sorted = labels
  .filter((r) => r.label !== 'Default')
  .sort((a, b) => order[a.label.toLowerCase()] - order[b.label.toLowerCase()])
  .map((r) => r.label)
console.log('slider order ->', sorted.join(' / '))
if (sorted.join(',') !== 'Off,Low,High,Max') throw new Error('semantic effort ordering failed')
