import { Color, View, ViewBase } from '@nativescript/core';
import { androidStatusBarBackgroundProperty, statusBarStyleProperty } from '@nativescript/core/ui/page';
import lazy from '@nativescript/core/utils/lazy';
import { applyMixins, cssNavigationBarColorProperty, cssProperty, cssStatusBarColorProperty } from './systemui-common';

const isPostLollipop = lazy(() => android.os.Build.VERSION.SDK_INT >= 21);

const SYSTEM_UI_FLAG_LIGHT_STATUS_BAR = 0x00002000;
const SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR = 0x00002000;

function contrastingColor(color: Color)
{
    return (luma(color) >= 165) ? '000' : 'fff';
}
function luma(color: Color) // color can be a hx string or an array of RGB values 0-255
{
    return (0.2126 * color.r) + (0.7152 * color.g) + (0.0722 * color.b); // SMPTE C, Rec. 709 weightings
}

declare module '@nativescript/core/ui/core/view' {
    interface View {
        _getFragmentManager(): androidx.fragment.app.FragmentManager;
    }
}
declare module '@nativescript/core/ui/core/view-base' {
    interface ViewBase {
        _dialogFragment: androidx.fragment.app.DialogFragment;
    }
}

async function getPageWindow(view: View): Promise<android.view.Window> {
    let topView: ViewBase = view.page;
    while (topView.parent) {
        topView = topView.parent;
    }
    if (topView && topView._dialogFragment) {
        const dialog = topView._dialogFragment.getDialog();
        if (dialog) {
            return dialog.getWindow();
        } else {
            return new Promise((resolve) => {
                topView.once(View.shownModallyEvent, () => {
                    resolve(topView._dialogFragment.getDialog().getWindow());
                });
            });
        }
    }
    return topView._context.getWindow();
}

class PageExtended {
    @cssProperty navigationBarColor: Color;
    @cssProperty statusBarColor: Color;
    async showStatusBar(animated?: boolean) {
        const window = await getPageWindow(this as any);
        window.getDecorView().setSystemUiVisibility(android.view.View.SYSTEM_UI_FLAG_VISIBLE);
    }
    async hideStatusBar(animated?: boolean) {
        const window = await getPageWindow(this as any);
        window.getDecorView().setSystemUiVisibility(android.view.View.SYSTEM_UI_FLAG_FULLSCREEN);
    }
    async [cssStatusBarColorProperty.setNative](color: Color) {
        if (isPostLollipop()) {
            const window = await getPageWindow(this as any);
            window.setStatusBarColor(color ? color.android : 0);
        }
    }
    async [cssNavigationBarColorProperty.setNative](color: Color) {
        if (isPostLollipop()) {
            const window = await getPageWindow(this as any);
            if (color) {
                window.addFlags(android.view.WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                window.setNavigationBarColor(color.android);
            } else {
                window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                window.setNavigationBarColor( 0);
            }
        }
    }

    async [statusBarStyleProperty.setNative](value: 'dark' | 'light' | number) {
        if (isPostLollipop()) {
            const window = await getPageWindow(this as any);
            const decorView = window.getDecorView();

            if (value === 'light') {
                decorView.setSystemUiVisibility(SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
            } else if (value === 'dark') {
                decorView.setSystemUiVisibility(0);
            } else {
                decorView.setSystemUiVisibility(value);
            }
        }
    }
    async [androidStatusBarBackgroundProperty.setNative](value: number | Color) {
        if (isPostLollipop()) {
            const window = await getPageWindow(this as any);
            const color = value instanceof Color ? value.android : value;
            window.setStatusBarColor(color);
        }
    }
}
class PageExtended2 {
    navigationBarColor: Color;
    statusBarColor: Color;
    statusBarStyle;
    public onNavigatingTo(context: any, isBackNavigation: boolean, bindingContext?: any) {
        if (isBackNavigation) {
            if (this.navigationBarColor) {
                this[cssNavigationBarColorProperty.setNative](this.navigationBarColor);
            }
            if (this.statusBarStyle) {
                this[statusBarStyleProperty.setNative](this.statusBarStyle);
            }
            if (this.statusBarColor) {
                this[cssStatusBarColorProperty.setNative](this.statusBarColor);
            }
        }
    }
}

let mixinInstalled = false;
export function overridePageBase() {
    const NSPage = require('@nativescript/core/ui/page').Page;
    applyMixins(NSPage, [PageExtended], { override: true });
    applyMixins(NSPage, [PageExtended2], { after: true });
}

export function installMixins() {
    if (!mixinInstalled) {
        mixinInstalled = true;
        overridePageBase();
    }
}
