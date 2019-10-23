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

  function findText(json) {
    var text = '';
    if (Array.isArray(json)) {
      json.forEach(function(node) {
        console.log('type', node.componentType)
        text += findText(node);
      });
    } else {
      if (json.componentType === 'text') {
        text += json.attrs.text;
      }
    }

    console.log('text', text)

    return text;
  }

  function json2jsx(json, whitelist) {
    var result = '';

    if (whitelist && !Array.isArray(json)) {
      var component = json.smart && json.smart.layerProtocol && json.smart.layerProtocol.component;
      if (!component || whitelist.indexOf(component.type) === -1) {
        return result;
      }
    }

    if (!!json.length && typeof json != 'string') {
      json.forEach(function(node) {
        result += json2jsx(node, whitelist);
      });
    } else if (typeof json == 'object') {
      var type = json.componentType;
      var className = json.attrs.className;
      var findComponent = false;
      var component = json.smart && json.smart.layerProtocol && json.smart.layerProtocol.component;

      if (component) {
        switch (component.type) {
          case 'InputGroup':
            var compact = component.params && typeof component.params.compact !== 'undefined';
            if (compact) {
              result += `<Input.Group style={styles.${className}} compact>${json2jsx(json.children)}</Input.Group>`;
            } else {
              result += `<Input.Group style={styles.${className}}>${json2jsx(json.children)}</Input.Group>`;
            }
            findComponent = true;
            break;
          case 'Input':
          case 'Select':
            var text = findText(json.children);
            var placeholder = component.params && typeof component.params.placeholder !== 'undefined';
            var defaultValue = component.params && typeof component.params.defaultValue !== 'undefined';
            json.style = {
              width: json.attrs.__ARGS__.width,
              height: json.attrs.__ARGS__.height
            };

            if (placeholder) {
              result += `<${component.type} style={styles.${className}} placeholder="${text}" />`;
            } else if (defaultValue) {
              result += `<${component.type} style={styles.${className}} defaultValue="${text}" />`;
            } else {
              result += `<${component.type} style={styles.${className}} />`;
            }
            
            antdImport[component.type] = `import {${component.type}} from 'antd'`;
            findComponent = true;
            // delete json.style.paddingRight;
            json.style.width = json.attrs.__ARGS__.width;
            break;
          case 'Button':
            var text = findText(json.children);
            if (type == 'picture') {
              json.style = Object.assign({}, json.style, {
                backgroundColor: json.attrs.originStyles.backgroundColor
              });
            }

            result += `<Button style={styles.${className}}>${text}</Button>`;
            antdImport[component.type] = `import {Button} from 'antd'`;
            findComponent = true;
            break;
          case 'Steps':
            json.style.width = json.attrs.__ARGS__.width;
            result += `<Steps style={styles.${className}}>${json2jsx(json.children, ['Step'])}</Steps>`;
            antdImport[component.type] = `import {Steps} from 'antd'`;
            findComponent = true;
            break;
          case 'Step':
            var text = json.attrs.text;
            result += `<Steps.Step style={styles.${className}} title="${text}"></Steps.Step>`;
            findComponent = true;
            break;
          case 'Breadcrumb':
            result += `<Breadcrumb style={styles.${className}}>${json2jsx(json.children, ['Breadcrumb.Item'])}</Breadcrumb>`;
            antdImport[component.type] = `import {Breadcrumb} from 'antd'`;
            findComponent = true;
            break;
          case 'Breadcrumb.Item':
            var text = json.attrs.text;
            result += `<Breadcrumb.Item href="" style={styles.${className}}>${text}</Breadcrumb.Item>`;
            findComponent = true;
            break;
          // case 'Menu':
          //   var mode = component.params && component.params.mode || "vertical";
          //   var theme = component.params && component.params.theme || "light";
          //   result += `<Menu style={styles.${className}} mode="${mode}" theme="${theme}">${json2jsx(json.children)}</Menu>`;
          //   antdImport[component.type] = `import {Menu} from 'antd'`;
          //   break;
          // case 'SubMenu':
          // case 'Menu.Item':
          // case 'Menu.ItemGroup':
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
  renderData.export = `ReactDOM.render(<Mod />, document.getElementById("container"));`;

  const prettierOpt = {
    printWidth: 120,
    singleQuote: true
  };


  return {
    renderData: renderData,
    xml: prettier.format(jsx, prettierOpt),
    style: prettier.format(renderData.style, prettierOpt),
    prettierOpt: prettierOpt,
    playground: {
      info: '前往 playground',
      link: 'https://codesandbox.io/s/funny-shape-33sie'
    }
  };
};
