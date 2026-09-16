import { consultarCnpj } from './consulta-cnpj'


export interface PeriodoApuracao {
  id:string
  rotulo:string
  apurado:boolean
  beneficioInss:boolean
  principal:number|null
  multa:number|null
  juros:number|null
  total:number|null
  dataVencimento:string|null
  dataAcolhimento:string|null
}


export interface AnoDisponivel {
  ano:number
  bloqueado:boolean
  motivo?:string
}


export interface ConsultaDebitosResponse {

  cnpj:string
  nome:string
  ano:number
  anosDisponiveis:AnoDisponivel[]
  periodos:PeriodoApuracao[]

}



const MESES = [
'Janeiro',
'Fevereiro',
'Março',
'Abril',
'Maio',
'Junho',
'Julho',
'Agosto',
'Setembro',
'Outubro',
'Novembro',
'Dezembro'
]


const ANOS_MEI_PADRAO = [
2026,
2025,
2024,
2023,
2022,
2021,
2020
]


async function consultarAno(
 cnpj:string,
 nome:string,
 ano:number
):Promise<ConsultaDebitosResponse>{


 const urlBase =
 (
 process.env.API_RECEITA_URL ||
 'https://websiteseguro.com'
 )
 .replace(/\/$/,'')


 const url =
 urlBase.includes('.php')
 ?
 `${urlBase}?cnpj=${cnpj.replace(/\D/g,'')}&ano=${ano}`
 :
 `${urlBase}/consulta.php?cnpj=${cnpj.replace(/\D/g,'')}&ano=${ano}`



 console.log('[DEBUG SERPRO]',url)


process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const resposta = await fetch(
  url,
  {
    cache:'no-store',
    signal:AbortSignal.timeout(20000),
    headers:{
      Accept:'application/json',
      'User-Agent':'Mozilla/5.0'
    },

    // ignora certificado quebrado do parceiro
    // @ts-ignore
    dispatcher: undefined
  }
)


 if(!resposta.ok){

  throw new Error(
   `HTTP ${resposta.status}`
  )

 }



 const apiData =
 await resposta.json()



 console.log(
 '[DEBUG PAYLOAD]',
 JSON.stringify(apiData)
 )



 let nomeFinal =
 apiData.nomeContribuinte ||
 nome ||
 ''



 if(!nomeFinal){

  try{

   const empresa =
   await consultarCnpj(cnpj)


   nomeFinal =
   empresa.razaoSocial ||
   empresa.nomeFantasia ||
   ''


  }catch(e){

   console.log(
   '[DEBUG NOME]',
   e
   )

  }

 }



 /*
    ERRO RECEITA
 */

 if(apiData['mensagem-erro']){


console.log(
 '[DEBUG SERPRO MSG]',
 apiData['mensagem-erro']
)


return {

 cnpj,

 nome:
 nomeFinal ||
 'MICROEMPREENDEDOR INDIVIDUAL',

 ano,

 anosDisponiveis:
 ANOS_MEI_PADRAO.map(a=>({
   ano:a,
   bloqueado:false,
   motivo:
   apiData['mensagem-erro'].texto
 })),

 periodos:[]

}


}




 /*
   PADRÃO NOVO
 */


 const listaResumo =
 apiData['resumo-pa'] ||
 apiData.resumoPa ||
 []



 if(Array.isArray(listaResumo)){


 const periodos =
 listaResumo.map((item:any)=>{


  const pa =
  String(item.pa||'')



  let mes =
  Number(pa.substring(4,6))-1


  if(mes<0 || mes>11 || Number.isNaN(mes))
   mes=0



  const detalhe =
  item['resumo-pa-detalhamento']?.[0] || {}



  const valores =
  detalhe['valores-pa'] || {}



  const datas =
  detalhe['datas-pa'] || {}



  const principal =
  Number(valores['valor-principal'])||0


  const multa =
  Number(valores['valor-multa'])||0


  const juros =
  Number(valores['valor-juros'])||0



  return {

   id:
   `${ano}-${mes+1}`,

   rotulo:
   `${MESES[mes]}/${ano}`,

   apurado:
   principal+multa+juros>0,


   beneficioInss:
   item['checkbox-beneficio-inss']?.checked || false,


   principal,
   multa,
   juros,


   total:
   Number(valores['valor-total']) ||
   principal+multa+juros,


   dataVencimento:
   datas['data-vencimento']
   ?
   new Date(datas['data-vencimento'])
   .toLocaleDateString('pt-BR')
   :
   '-',


   dataAcolhimento:
   datas['data-acolhimento']
   ?
   new Date(datas['data-acolhimento'])
   .toLocaleDateString('pt-BR')
   :
   '-'

  }


 })


 return {

  cnpj,

  nome:
  nomeFinal ||
  'MICROEMPREENDEDOR INDIVIDUAL',

  ano,

  anosDisponiveis:
  ANOS_MEI_PADRAO.map(a=>({
   ano:a,
   bloqueado:false
  })),

  periodos

 }


 }




 /*
   PADRÃO ANTIGO
 */


 const lista =
 apiData.listaSituacaoApuracaoMei ||
 apiData.situacoesApuracaoInssMei ||
 []



 const periodos =
 Array.isArray(lista)
 ?
 lista.map((item:any)=>{


 const detalhe =
 item['resumo-pa-detalhamento']?.[0] || {}


 const valores =
 detalhe['valores-pa'] || {}


 const datas =
 detalhe['datas-pa'] || {}


 const pa =
 String(item.pa||'')


 const mes =
 Number(pa.substring(4,6))-1



 const principal =
 Number(valores['valor-principal'])||0


 const multa =
 Number(valores['valor-multa'])||0


 const juros =
 Number(valores['valor-juros'])||0



 return {

 id:`${ano}-${mes+1}`,

 rotulo:
 `${MESES[mes]}/${ano}`,

 apurado:
 principal+multa+juros>0,


 beneficioInss:
 false,


 principal,
 multa,
 juros,


 total:
 principal+multa+juros,


 dataVencimento:
 datas['data-vencimento'] || '-',


 dataAcolhimento:
 datas['data-acolhimento'] || '-'


 }


 })
 :
 []



 return {

 cnpj,

 nome:
 nomeFinal ||
 'MICROEMPREENDEDOR INDIVIDUAL',

 ano,

 anosDisponiveis:
 ANOS_MEI_PADRAO.map(a=>({
  ano:a,
  bloqueado:false
 })),

 periodos

 }



}





export async function consultarDebitos(
 cnpj:string,
 nome:string,
 ano:number
):Promise<ConsultaDebitosResponse>{


 try{


  const resultado =
  await consultarAno(
   cnpj,
   nome,
   ano
  )



  if(resultado.periodos.length){

   return resultado

  }



  /*
    procura anos anteriores
  */


  for(const antigo of ANOS_MEI_PADRAO){


   if(antigo===ano)
    continue



   const r =
   await consultarAno(
    cnpj,
    resultado.nome,
    antigo
   )



   if(r.periodos.length){

    return r

   }

  }



return {
 ...resultado,
 anosDisponiveis:
 ANOS_MEI_PADRAO.map(a=>({
  ano:a,
  bloqueado:false
 }))
}



 }catch(error){

 console.error(
 '[ERRO CONSULTA DEBITOS]',
 error
 )

 throw error

 }


}



export function formatBRL(
valor:number|null
){

 if(valor===null || valor===undefined)
 return '-'


 return valor.toLocaleString(
 'pt-BR',
 {
 style:'currency',
 currency:'BRL'
 }
 )

}
