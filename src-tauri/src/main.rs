#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::{env, net::TcpStream, thread, time::Duration};

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

  wait_for_api(8001);

  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
