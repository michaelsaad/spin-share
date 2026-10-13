// Manual backup: download the current game as a JSON file / load one back.

const FILE_APP = 'spin-share'

export function downloadSave(state) {
  const body = JSON.stringify({ app: FILE_APP, format: 1, savedAt: Date.now(), state }, null, 2)
  const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `spin-share-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function uploadSave() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async () => {
      try {
        const obj = JSON.parse(await input.files[0].text())
        if (obj?.app !== FILE_APP || !obj.state) throw new Error('الملف ده مش ملف حفظ اللعبة')
        resolve(obj)
      } catch (err) {
        reject(err)
      }
    }
    input.click()
  })
}
