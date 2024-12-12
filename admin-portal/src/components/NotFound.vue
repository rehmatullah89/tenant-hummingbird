<template>
    <div class="not-found">
        <h1>404</h1>
        <h3>We couldn't find what you are looking for.<br /><br />
            Try <router-link to="/login">starting over at the beginning</router-link>
        </h3>
    </div>

</template>

<style scoped>
    .not-found{
        margin: 50px;
        text-align: center;

    }
    .not-found h1{
        line-height: 300px;
        font-size: 300px;
        font-weight: 800;
        color: #cbd5d8;
    }
</style>