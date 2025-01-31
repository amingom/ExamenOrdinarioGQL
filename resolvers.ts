import { Collection, ObjectId } from "mongodb";
import { API_CITY, RestauranteModel } from "./types.ts";
import { GraphQLError, responsePathAsArray } from "graphql";
import { parentPort } from "node:worker_threads";


type Context = {
    restauranteCollections: Collection<RestauranteModel>
}

const temperatura = async(
    latitude: number,
    longitude: number
): Promise<number> => {
    const API_KEY = Deno.env.get('API_KEY');
    const url = `https://api.api-ninjas.com/v1/weather?lat= ${latitude}&lon= ${longitude}`;
    const data = await fetch(url, {headers:{'X-Api-Key': API_KEY}});

    if(data.status !== 200){
        throw new GraphQLError("No se ha podido hacer fetch");
    }

    const respuesta = await data.json();

    return respuesta.temp;
}

const buscarCiudad = async(
    ciudad: string
): Promise<API_CITY> => {
    const API_KEY = Deno.env.get('API_KEY');
    const url = `https://api.api-ninjas.com/v1/city?name= ${ciudad}`;
    const data = await fetch(url, {headers:{'X-Api-Key': API_KEY}});

    if(data.status !== 200){
        throw new GraphQLError("No se ha podido hacer fetch de la API_CITY");
    }

    const respuesta = await data.json();

    if(respuesta[0] === undefined){
        throw new GraphQLError("La respuesta es indefinida");
    }

    const datosCiudad:API_CITY = {
        latitude: respuesta[0].latitude,
        longitude: respuesta[0].longitude,
    }

    return datosCiudad;
}

const hora = async(
    latitude: number,
    longitude: number
): Promise<string> => {
    const API_KEY = Deno.env.get('API_KEY');
    const url = `https://api.api-ninjas.com/v1/worldtime?lat= ${latitude}&lon= ${longitude}`;
    const data = await fetch(url, {headers:{'X-Api-Key': API_KEY}});

    if(data.status !== 200){
        throw new GraphQLError("No se ha podido hacer fetch de la hora");
    }

    const respuesta = await data.json();

    return `${respuesta.hora}:${respuesta.minute}`;
}

export const resolvers = {
    Restaurante: {
        id: (parent: RestauranteModel) => {
            return parent._id.toString();
        },
        
        temperatura: async(parent: RestauranteModel) => {
            const ciudad = await buscarCiudad(parent.ciudad);
            const temp = temperatura(ciudad.latitude, ciudad.longitude);
            
            return temp;
        },
        hora: async(parent: RestauranteModel) => {
            const ciudad = await buscarCiudad(parent.ciudad);
            const horaActual = await hora(ciudad.latitude, ciudad.longitude);

            return horaActual;
        }
    },
    Query: {
        getRestaurants: async(
            _: unknown,
            args: {ciudad: string},
            ctx: Context
        ):Promise<RestauranteModel[]> => {
            const restaurantes = await ctx.restauranteCollections.find({ciudad: args.ciudad}).toArray();
            if(restaurantes.length > 0){
                return restaurantes;
            } else {
                throw new GraphQLError("No se han encontrado restaurantes en esa ciudad");
            }
        },
        getRestaurant: async (
            _: unknown,
            args: {id: string},
            ctx: Context,
        ):Promise<RestauranteModel|null> => {
            const restaurante = await ctx.restauranteCollections.findOne({_id: new ObjectId(args.id)});

            return restaurante;
        }
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
            const {deletedCount} = await ctx.restauranteCollections.deleteOne({_id: new Object(args.id)});

            if(deletedCount){
                return true;
            } else{
                return false;
            }
        }
    }
}