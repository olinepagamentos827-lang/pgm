import { consultarCnpj } from './consulta-cnpj'


process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'



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




 console.log(

 '[DEBUG SERPRO]',

 url

 )




 const resposta = await fetch(

  url,

  {

    cache:'no-store',

    signal:AbortSignal.timeout(60000),

    headers:{

      Accept:'application/json',

      'User-Agent':'Mozilla/5.0'

    }

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

    '[DEBUG NOME ERRO]',

    e

   )


  }


 }





 /*
    ERROS SERPRO
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
   PADRÃO NOVO SERPRO
   resumo-pa
 */


 const listaResumo =

 apiData['resumo-pa'] ||

 apiData.resumoPa ||

 []




 if(Array.isArray(listaResumo)){



  const periodos:PeriodoApuracao[] =

  listaResumo.map((item:any)=>{



    const pa =

    String(item.pa || '')



    let mes =

    Number(pa.substring(4,6)) - 1



    if(

      Number.isNaN(mes) ||

      mes < 0 ||

      mes > 11

    ){

      mes = 0

    }




    const detalhe =

    item['resumo-pa-detalhamento']?.[0] || {}




    const valores =

    detalhe['valores-pa'] || {}




    const datas =

    detalhe['datas-pa'] || {}





    const principal =

    Number(

      valores['valor-principal']

    ) || 0




    const multa =

    Number(

      valores['valor-multa']

    ) || 0




    const juros =

    Number(

      valores['valor-juros']

    ) || 0





    const total =

    Number(

      valores['valor-total']

    ) ||

    principal + multa + juros





    return {



      id:

      `${ano}-${String(mes+1).padStart(2,'0')}`,




      rotulo:

      `${MESES[mes]}/${ano}`,




      apurado:

      principal + multa + juros > 0,




      beneficioInss:

      item['checkbox-beneficio-inss']?.checked ||

      false,




      principal,

      multa,

      juros,




      total,




      dataVencimento:

      datas['data-vencimento']

      ?

      new Date(

        datas['data-vencimento']

      )

      .toLocaleDateString('pt-BR')

      :

      '-',




      dataAcolhimento:

      datas['data-acolhimento']

      ?

      new Date(

        datas['data-acolhimento']

      )

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
   PADRÃO ANTIGO SERPRO
 */



 const lista =

 apiData.listaSituacaoApuracaoMei ||

 apiData.situacoesApuracaoInssMei ||

 apiData.situacaoApuracaoInssMei ||

 []






 const periodos:PeriodoApuracao[] =

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

   String(item.pa || '')




   let mes =

   Number(pa.substring(4,6)) - 1




   if(

    Number.isNaN(mes) ||

    mes < 0 ||

    mes > 11

   ){

    mes = 0

   }






   const principal =

   Number(

    valores['valor-principal']

   ) || 0





   const multa =

   Number(

    valores['valor-multa']

   ) || 0





   const juros =

   Number(

    valores['valor-juros']

   ) || 0





   return {



    id:

    `${ano}-${String(mes+1).padStart(2,'0')}`,





    rotulo:

    `${MESES[mes]}/${ano}`,





    apurado:

    principal + multa + juros > 0,





    beneficioInss:

    false,





    principal,

    multa,

    juros,





    total:

    principal + multa + juros,





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
 nome:string
):Promise<ConsultaDebitosResponse>{


 const anosBusca = [
  2026,
  2025,
  2024,
  2023,
  2022,
  2021,
  2020
 ]



 let ultimoResultado:ConsultaDebitosResponse = {

  cnpj,

  nome:
  nome ||
  'MICROEMPREENDEDOR INDIVIDUAL',

  ano:0,


  anosDisponiveis:

  anosBusca.map(ano=>({

   ano,

   bloqueado:false

  })),


  periodos:[]

 }





 for(const ano of anosBusca){


  try{


   console.log(
    '[BUSCANDO ANO]',
    ano
   )



   const resultado =

   await consultarAno(

    cnpj,

    nome,

    ano

   )




   console.log(

    '[RESULTADO]',

    ano,

    resultado.periodos.length

   )





   /*
      ACHOU DÉBITOS
      PARA AQUI
   */

   if(resultado.periodos.length > 0){


    return {

     ...resultado,


     anosDisponiveis:

     anosBusca.map(a=>({

      ano:a,

      bloqueado:false

     }))


    }


   }





   ultimoResultado = resultado




  }catch(error:any){



   console.error(

    '[ERRO CONSULTANDO ANO]',

    ano,

    error.message

   )



   continue



  }


 }




 /*
    nenhum ano possui débito
 */


 return ultimoResultado


}






export function formatBRL(

 valor:number|null

){


 if(

  valor === null ||

  valor === undefined

 ){

  return '-'

 }



 return valor.toLocaleString(

  'pt-BR',

  {

   style:'currency',

   currency:'BRL'

  }

 )


}
