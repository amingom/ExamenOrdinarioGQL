import { Collection, ObjectId } from "mongodb";
import { RestauranteModel } from "./types.ts";
import { GraphQLError } from "graphql";

type Context = {
    restauranteCollections: Collection<RestauranteModel>
}

export const resolvers = {
    Restaurante: {
        id: (parent: RestauranteModel) => {
            return parent._id.toString();
        }
    },
    Query: {
        getRestaurants: async(
            _: unknown,
            args: {ciudad: string},
            ctx: Context
        ):Promise<RestauranteModel[]|null> => {
            const restaurantes = await ctx.restauranteCollections.find({ciudad: args.ciudad}).toArray();
            if(restaurantes){
                return restaurantes;
            } else {
                throw new GraphQLError("No se han encontrado restaurantes en esa ciudad");
            }
        },
        /*getRestaurant: async (
            _: unknown,
            args: {id: string},
            ctx: Context,
        ):Promise<Restaurante|null> => {
            const restaurante = await ctx.restauranteCollections.findOne({_id: new ObjectId(args.id)});

            if(restaurante){
                
            } else {
                throw new GraphQLError("No se ha encontrado el restaurante");
            }


        }*/
    },
    Mutation: {
        addRestaurant: async(
            _: unknown,
            args: {nombre: string, direccion: string, ciudad: string, telefono: string}, 
            ctx: Context,
        ):Promise<RestauranteModel> => {
            const telefonoDB = await ctx.restauranteCollections.findOne({telefono: args.telefono});

            if(telefonoDB){
                throw new GraphQLError("El teléfono ya existe");
            }

            const API_KEY = Deno.env.get('API_KEY');
            const url = 'https://api.api-ninjas.com/v1/validatephone?number=' + args.telefono;
            const data = await fetch(url, {headers:{'X-Api-Key': API_KEY}});

            if(data.status !== 200){
                throw new GraphQLError("No se ha podido hacer fetch de la API_PHONE");
            }

            const respuesta = await data.json();

            if(respuesta.is_valid){
                const {insertedId} = await ctx.restauranteCollections.insertOne({
                    nombre: args.nombre,
                    direccion: args.direccion,
                    ciudad: args.ciudad,
                    telefono: args.telefono    
                });

                if(insertedId){
                    const personaAñadida = await ctx.restauranteCollections.findOne({_id: insertedId});

                    if(personaAñadida){
                        return personaAñadida;
                    } else {
                        throw new GraphQLError("No se pudieron mostrar los datos de la persona añadida");
                    }
                }
            }else {
                throw new GraphQLError("El teléfono no es válido");
            }

            throw new GraphQLError("No se ha podido añadir a la persona");

        },
        deleteRestaurant: async(
            _: unknown,
            args: {id: string},
            ctx: Context,
        ):Promise<boolean> => {
            const {deletedCount} = await ctx.restauranteCollections.deleteOne({_id: new ObjectId(args.id)});

            if(deletedCount){
                return true;
            } else{
                return false;
            }
        }
    }
}