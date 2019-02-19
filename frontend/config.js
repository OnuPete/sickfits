// This is client side config only - don't put anything in here that shouldn't be public!
export const endpoint = `http://localhost:4444`;
export const perPage = 4;

// docker run -p 5435:5432 -v anami-aws:/var/lib/postgresql/data
// docker container exec -i anami-db ./db-aws.sh