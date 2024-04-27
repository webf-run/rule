import gleam/string_builder
import wisp.{type Request, type Response}

pub fn handle_request(request: Request) -> Response {
  let body = string_builder.from_string("Hello, World!")

  wisp.html_response(body, 200)
}
