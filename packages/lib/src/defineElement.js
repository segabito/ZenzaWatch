//===BEGIN===

const defineElement = (name, classDefinition) => {
  if (!window.customElements) {
    return false;
  }
  if (customElements.get(name)) {
    return true;
  }
  customElements.define(name, classDefinition);
  return true;
};

//===END===

export {defineElement};