const appender = () => {
  const prTitleField = document.getElementById("merge_title_field") as HTMLInputElement | null;
  console.log(prTitleField)

  if (prTitleField) {
    (() => {
      const maybeCheckboxDom = document.getElementById("skip_ci_checkbox") as HTMLInputElement | null
      if (maybeCheckboxDom) {
        maybeCheckboxDom.checked = true
        return maybeCheckboxDom
      }

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = "skip_ci_checkbox"
      checkbox.checked = true;
      checkbox.onchange = (checked) => {
        if ((checked.currentTarget as HTMLInputElement).checked) {
          prTitleField.value = `${prTitleField.value} [ci skip]`
        } else {
          prTitleField.value = prTitleField.value.replace(/(\s*)\[(ci skip|skip ci)+\](\s*)/, "")
        }
      }

      const label = document.createElement("label");
      label.innerText = " ci skip toggle "
      label.appendChild(checkbox)

      prTitleField.parentElement?.appendChild(label)
    })()

    const alreadyCiSkip = !!(prTitleField.value.match(/ci/) && prTitleField.value.match(/skip/))
    if (!alreadyCiSkip) {
      prTitleField.value = `${prTitleField.value} [ci skip]`
    }
  }
}

let waiting = true
const waitTitle = () => {
  console.log("waittitle...")
  const prTitleField = document.getElementById("merge_title_field") as HTMLInputElement | null;
  if (!prTitleField) {
    return setTimeout(waitTitle, 1000)
  } else {
    appender()
    waiting = false
  }
}

waitTitle()

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(request.url, waiting);
  if (waiting || !request.url.match(/pull\//)) {
    return
  }
  waitTitle()
});
