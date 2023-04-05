#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::{env, process::Command, net::TcpStream, thread, time::Duration};

fn launch_model_apis() {
  let binary_path = if cfg!(windows) {
      "./binaries/python-binary.exe"
  } else {
      "./binaries/dist/apis/apis"
  };
  let _ = Command::new(binary_path).spawn();
}

fn wait_for_api(port: u16) {
  loop {
    match TcpStream::connect(("127.0.0.1", port)) {
      Ok(_) => break,
      Err(_) => {
        println!("API not ready yet. Waiting for 1 second...");
        thread::sleep(Duration::from_secs(1));
      }
    }
  }
}

fn main() {
  launch_model_apis();

  wait_for_api(8001);

  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
