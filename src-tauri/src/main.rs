#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::{env, net::TcpStream, thread, time::Duration};
use tauri::{
  api::process::{Command, CommandEvent},
  Manager,
};

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
  tauri::Builder::default()
    .setup(|app| {
      let window = app.get_window("main").unwrap();
      tauri::async_runtime::spawn(async move {
        let (mut rx, mut child) = Command::new_sidecar("apis")
          .expect("failed to setup `apis` sidecar")
          .spawn()
          .expect("Failed to spawn packaged python.");

        let mut i = 0;
        while let Some(event) = rx.recv().await {
          if let CommandEvent::Stdout(line) = event {
            window
              .emit("message", Some(format!("'{}'", line)))
              .expect("failed to emit event");
            i += 1;
            if i == 4 {
              child.write("message from Rust\n".as_bytes()).unwrap();
              i = 0;
            }
          }
        }
      });
      
      wait_for_api(8001);

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
