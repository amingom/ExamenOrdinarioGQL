export const schema =`#graphql   

    type Restaurante {
        id: ID!
        nombre: String!
        direccion: String!
        ciudad: String!
        telefono: String!
        temperatura: String
        hora: String
    }

    type Query{
        getRestaurants(nombre: String!): [Restaurante]
        getRestaurant(id: ID!): Restaurante
    }

    type Mutation{
        addRestaurant(nombre: String!, direccion: String!, ciudad: String!, telefono: String!): Restaurante!
        deleteRestaurant(id: ID!): Boolean!
    }
`