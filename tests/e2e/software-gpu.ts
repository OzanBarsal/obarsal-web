import type { Page } from '@playwright/test';

type GetExtension = (this: WebGL2RenderingContext, name: string) => unknown;
type GetParameter = (this: WebGL2RenderingContext, pname: number) => unknown;

export async function allowSoftwareGpu(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const proto = WebGL2RenderingContext.prototype as unknown as { getExtension: GetExtension };
    const original = proto.getExtension;
    proto.getExtension = function (name) {
      return name === 'WEBGL_debug_renderer_info' ? null : original.call(this, name);
    };
  });
}

export async function forceSoftwareGpu(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const proto = WebGL2RenderingContext.prototype as unknown as { getParameter: GetParameter };
    const original = proto.getParameter;
    proto.getParameter = function (pname) {
      const debug = this.getExtension('WEBGL_debug_renderer_info');
      return debug && pname === debug.UNMASKED_RENDERER_WEBGL
        ? 'Google SwiftShader (test)'
        : original.call(this, pname);
    };
  });
}
