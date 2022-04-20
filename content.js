(() => {
  // content.ts
  var appender = () => {
    const prTitleField = document.getElementById("merge_title_field");
    console.log(prTitleField);
    if (prTitleField) {
      const value = prTitleField.value;
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = "skip_ci_checkbox";
      checkbox.checked = true;
      checkbox.onchange = (checked) => {
        if (checked.currentTarget.checked) {
          prTitleField.value = `${value} [ci skip]`;
        } else {
          prTitleField.value = value.replace(/\[(ci skip|skip ci)+\]/, "");
        }
      };
      checkbox.innerHTML = "append ci skip?";
      prTitleField.parentElement?.appendChild(checkbox);
      const alreadyCiSkip = !!(value.match(/ci/) && value.match(/skip/));
      if (!alreadyCiSkip) {
        prTitleField.value = `${value} [ci skip]`;
      }
    }
  };
  var waitTitle = () => {
    const prTitleField = document.getElementById("merge_title_field");
    if (!prTitleField) {
      return setTimeout(waitTitle, 1e3);
    } else {
      appender();
    }
  };
  waitTitle();
})();
