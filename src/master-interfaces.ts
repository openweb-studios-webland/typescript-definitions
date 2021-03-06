import _ from 'lodash';
import d from 'debug';
import { ParsedDocumentationResult } from '@electron/docs-parser';
const debug = d('master-interface');

export const generateMasterInterfaces = (
  API: ParsedDocumentationResult,
  addToOutput: (lines: string[], sep?: string) => void,
) => {
  // Generate Main / Renderer process interfaces
  const CommonInterface = ['interface CommonInterface {'];
  const MainInterface = ['interface MainInterface extends CommonInterface {'];
  const RendererInterface = ['interface RendererInterface extends CommonInterface {'];
  const ElectronMainAndRendererInterface = [
    'interface AllElectron extends MainInterface, RendererInterface {}',
  ];
  const constDeclarations: string[] = [];
  const EMRI: Record<string, boolean> = {};

  const classify = (moduleName: string) => {
    switch (moduleName.toLowerCase()) {
      case 'session':
        return 'session';
      case 'nativeimage':
        return 'nativeImage';
      case 'webcontents':
        return 'webContents';
      default:
        return moduleName;
    }
  };

  API.forEach((module, index) => {
    if (module.name === 'process') return;
    let TargetInterface;
    const isClass =
      module.type === 'Class' ||
      API.some(
        (tModule, tIndex) =>
          index !== tIndex && tModule.name.toLowerCase() === module.name.toLowerCase(),
      );
    const moduleString = `  ${classify(module.name)}: ${isClass ? 'typeof ' : ''}${_.upperFirst(
      module.name,
    )}`;
    if (module.type === 'Structure') {
      // We must be a structure or something
      return;
    }
    if (!isClass || module.name !== classify(module.name)) {
      if (isClass) {
        constDeclarations.push(
          `type ${classify(module.name)} = ${_.upperFirst(module.name)};`,
          `const ${classify(module.name)}: typeof ${_.upperFirst(module.name)};`,
        );
      } else {
        constDeclarations.push(`const ${classify(module.name)}: ${_.upperFirst(module.name)};`);
      }
    }
    if (module.process.main && module.process.renderer) {
      TargetInterface = CommonInterface;
    } else if (module.process.main) {
      TargetInterface = MainInterface;
    } else if (module.process.renderer) {
      TargetInterface = RendererInterface;
    }
    if (TargetInterface) {
      debug(classify(module.name).toLowerCase(), EMRI[classify(module.name).toLowerCase()]);
      if (!EMRI[classify(module.name).toLowerCase()]) {
        TargetInterface.push(moduleString);
      }
      EMRI[classify(module.name).toLowerCase()] = true;
    }
  });

  CommonInterface.push('}');
  MainInterface.push('}');
  RendererInterface.push('}');

  addToOutput(['']);
  addToOutput(CommonInterface, ';');
  addToOutput(MainInterface, ';');
  addToOutput(RendererInterface, ';');
  addToOutput(ElectronMainAndRendererInterface, ';');
  addToOutput(constDeclarations);
};
