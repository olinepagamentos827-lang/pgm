export interface ConsultaCnpjResponse {

  sucesso:boolean

  razaoSocial:string

  nomeFantasia:string

  cnpj:string

  erro?:string

}



export async function consultarCnpj(
  cnpj:string
):Promise<ConsultaCnpjResponse>{


try {


const cnpjLimpo =
cnpj.replace(/\D/g,'')



const apiKey =
process.env.CNPJ_API_KEY



if(!apiKey){

return {

sucesso:false,

razaoSocial:'',

nomeFantasia:'',

cnpj:cnpjLimpo,

erro:'CNPJ_API_KEY ausente'

}

}




const url =
`https://snoopintelligence.cloud/api/v2/cnpj?cnpj=${cnpjLimpo}`



console.log(
'[SNOOP CONSULTA]',
url
)



const resposta =
await fetch(
url,
{
method:'GET',

headers:{
Authorization:`Bearer ${apiKey}`,
Accept:'application/json'
},

cache:'no-store'

}
)



const texto =
await resposta.text()



console.log(
'[SNOOP RAW]',
texto.substring(0,300)
)



let dados:any


try{

dados =
JSON.parse(texto)

}catch{


return {

sucesso:false,

razaoSocial:'',

nomeFantasia:'',

cnpj:cnpjLimpo,

erro:'Snoop retornou resposta inválida'

}

}



if(!resposta.ok){


return {

sucesso:false,

razaoSocial:'',

nomeFantasia:'',

cnpj:cnpjLimpo,

erro:`Snoop HTTP ${resposta.status}`

}


}



const empresa =
dados.data || dados



return {


sucesso:true,


cnpj:
empresa.cnpj || cnpjLimpo,


razaoSocial:
empresa.razao_social ||
empresa.razaoSocial ||
'',


nomeFantasia:
empresa.nome_fantasia ||
empresa.nomeFantasia ||
''


}



}catch(error:any){


console.error(
'[ERRO CONSULTA CNPJ]',
error
)


return {

sucesso:false,

razaoSocial:'',

nomeFantasia:'',

cnpj,

erro:error.message

}


}


}
