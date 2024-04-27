import gleam/erlang/process
import mist
import wisp

import server/router

pub fn main() -> Nil {
  // Sets the logger to print INFO level logs
  wisp.configure_logger()

  // We don't use any signing in this application so the secret
  // key can be generated anew each time.
  let secret_key_base = wisp.random_string(64)

  let _server =
    wisp.mist_handler(router.handle_request, secret_key_base)
    |> mist.new
    |> mist.port(8080)
    |> mist.start_http()

  // The web server runs in new Erlang process, so put this
  // one to sleep while it works concurrently.
  process.sleep_forever()
}

pub type Y =
  fn(List(String)) -> List(String)

pub type X =
  fn(Y, String) -> fn(List(Int)) -> List(String)
