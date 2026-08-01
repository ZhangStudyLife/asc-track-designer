#[allow(
    non_snake_case,
    non_upper_case_globals,
    non_camel_case_types,
    dead_code,
    clippy::all
)]
pub mod Microsoft {
    pub mod Web {
        pub mod WebView2 {
            pub mod Win32 {
                mod windows_link {
                    macro_rules! link_webview2 {
                        ($library:literal $abi:literal fn $function:ident($($argument:ident : $argument_type:ty),*) -> $return_type:ty) => {
                            unsafe fn $function($($argument: $argument_type),*) -> $return_type {
                                type Function = unsafe extern $abi fn($($argument_type),*) -> $return_type;
                                static FUNCTION: std::sync::OnceLock<Function> = std::sync::OnceLock::new();
                                let function = *FUNCTION.get_or_init(|| unsafe {
                                    std::mem::transmute(crate::loader::symbol(
                                        concat!(stringify!($function), "\0").as_bytes(),
                                    ))
                                });
                                unsafe { function($($argument),*) }
                            }
                        };
                    }

                    pub(crate) use link_webview2 as link;
                }

                include!("bindings.rs");
            }
        }
    }
}

mod loader {
    use std::{ffi::c_void, os::windows::ffi::OsStrExt, sync::OnceLock};

    #[link(name = "kernel32")]
    extern "system" {
        fn LoadLibraryW(path: *const u16) -> *mut c_void;
        fn GetProcAddress(module: *mut c_void, name: *const u8) -> *mut c_void;
    }

    static MODULE: OnceLock<usize> = OnceLock::new();

    pub fn symbol(name: &'static [u8]) -> *const c_void {
        let module = *MODULE.get_or_init(|| {
            let path = std::env::var_os("ASC_WEBVIEW2_LOADER_PATH")
                .expect("ASC_WEBVIEW2_LOADER_PATH is not configured");
            let wide: Vec<u16> = path.encode_wide().chain(Some(0)).collect();
            let module = unsafe { LoadLibraryW(wide.as_ptr()) };
            assert!(!module.is_null(), "failed to load the embedded WebView2 loader");
            module as usize
        });

        let address = unsafe { GetProcAddress(module as *mut c_void, name.as_ptr()) };
        assert!(!address.is_null(), "WebView2 loader function is unavailable");
        address
    }
}

pub mod declared_interfaces;
