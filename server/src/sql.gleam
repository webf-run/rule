import gleam/dynamic
import gleam/io
import gleam/list
import sqlight

pub fn sql_eg() {
  use conn <- sqlight.with_connection("file:quiz.db")

  let cat_decoder = dynamic.tuple2(dynamic.string, dynamic.int)

  let sql =
    "
    create table if not exists cats (
      name text,
      age int
    );

    insert
      into cats (name, age)
      values
        ('Nubi', 4),
        ('Biffy', 10),
        ('Ginny', 6);
  "

  let assert Ok(Nil) = sqlight.exec(sql, conn)

  let result =
    sqlight.query(
      "select name, age from cats",
      on: conn,
      with: [],
      expecting: cat_decoder,
    )

  case result {
    Ok(rows) -> {
      list.each(rows, fn(row) { io.debug(row) })
    }
    Error(e) -> {
      io.debug(e)
      Nil
    }
  }

  io.println("Hello from quiz!")
}
