function casHandler(str, value) {
  var casArr = str.split('.');
  var casObj = {};

  if (casArr.length == 0) {
    casObj[str] = value;
  }

  casArr.reverse().forEach(function(cas) {
    if (cas.indexOf('[') == -1) {
      casObj[cas] = value;
    } else {
      var newCasObj = {};
      var key = cas.split('[')[0];
      newCasObj[key] = [casObj];
      casObj = newCasObj;
    }
  });
  return casObj;
}

module.exports = function(layoutData, options) {
  const renderData = {};
  const prettier = options.prettier;
  const _ = options._;
  const antdImport = {};
  const style = {};
  let mock = {};

  function json2jsx(json) {
    var result = '';

    if (!!json.length && typeof json != 'string') {
      json.forEach(function(node) {
        result += json2jsx(node);
      });
    } else if (typeof json == 'object') {
      var type = json.componentType;
      var className = json.attrs.className;
      var baseComponent = json.identification && json.identification.baseComponent;
      var findComponent = false;

      if (baseComponent) {
        switch (baseComponent) {
          case 'input':
            result += `<Input style={styles.${className}} />`;
            antdImport[baseComponent] = `import {Input} from 'antd'`;
            findComponent = true;
            delete json.style.paddingRight;
            json.style.width = json.attrs.__ARGS__.width;
            break;
          case 'switch':
            result += `<Switch style={styles.${className}} />`;
            antdImport[baseComponent] = `import {Switch} from 'antd'`;
            findComponent = true;
            break;
          case 'rating':
            result += `<Rate style={styles.${className}} />`;
            antdImport[baseComponent] = `import {Rate} from 'antd'`;
            findComponent = true;
            if (typeof json.style.marginTop !== 'undefined') {
              json.style.marginTop -= 6;
            } else {
              json.style.marginTop = -6;
            }
            break;
          default:
            break;
        }
        style[className] = json.style;
      } 

      if (!findComponent) {
        switch (type) {
          case 'text':
            var lines = json.attrs.lines;
            var innerText = json.innerText;

            result += `<span style={styles.${className}}>${innerText}</span>`;

            if (lines == 1 && !json.attrs.fixed) {
              delete json.style.width;
              delete json.style.height;
            }

            delete json.style.fontFamily;
            delete json.style.lines;
            break;
          case 'view':
            if (json.children && json.children.length > 0) {
              result += `<div style={styles.${className}}>${json2jsx(
                json.children
              )}</div>`;
            } else {
              result += `<div style={styles.${className}} />`;
            }
            break;
          case 'picture':
            var source = `${json.attrs.src}`;
            result += `<img style={styles.${className}} src="${source}" />`;
            break;
        }
        style[className] = json.style;
      }      
    } else {
      return json
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    return result;
  }

  // transform json
  var jsx = `${json2jsx(layoutData)}`;

  renderData.modClass = `
    class Mod extends Component {
      render() {
        return (
          ${jsx}
        );
      }
    }
  `;

  renderData.import = Object.keys(antdImport)
    .map(key => {
      return antdImport[key];
    })
    .join('\n');
  renderData.style = `var styles = ${JSON.stringify(style)}`;
  renderData.export = `ReactDOM.render(<Mod />, document.getElementById("root"));`;

  const prettierOpt = {
    printWidth: 120,
    singleQuote: true
  };

  return {
    renderData: renderData,
    xml: prettier.format(jsx, prettierOpt),
    style: prettier.format(renderData.style, prettierOpt),
    prettierOpt: prettierOpt
  };
};
